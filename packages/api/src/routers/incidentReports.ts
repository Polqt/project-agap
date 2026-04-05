import { z } from "zod";

import { ApiError } from "../errors";
import type { Context } from "../context";
import { officialProcedure, router } from "../index";
import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { barangayIdSchema, uuidSchema } from "../schemas";
import type { Alert, DashboardSummary, IncidentReport, NeedsReport, TableInsert } from "../supabase";
import {
  buildIncidentReportFromContext,
  buildIncidentReportFromSummary,
} from "../ai/incidentReportBuilder";

const reportColumns =
  "id, barangay_id, generated_by, title_english, title_filipino, body_english, body_filipino, next_steps_english, next_steps_filipino, dashboard_snapshot, generation_source, created_at";

type GenerateIncidentReportResult = {
  report: IncidentReport;
  usedCachedFallback: boolean;
  cachedMessage: string | null;
};

function timeoutPromise(ms: number) {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(ApiError.internal("Incident report generation timed out.")), ms);
  });
}

async function getLatestIncidentReport(ctx: {
  supabase: Context["supabase"];
}, barangayId: string) {
  return getSupabaseDataOrThrow<IncidentReport | null>(
    await ctx.supabase
      .from("incident_reports")
      .select(reportColumns)
      .eq("barangay_id", barangayId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Failed to fetch cached incident report.",
  );
}

export const incidentReportsRouter = router({
  generate: officialProcedure
    .input(
      z.object({
        barangayId: uuidSchema.optional(),
        forceRefresh: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<GenerateIncidentReportResult> => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      const summaryRows = getSupabaseDataOrThrow<DashboardSummary[]>(
        await ctx.supabase.rpc("get_dashboard_summary", {
          p_barangay_id: barangayId,
        }),
        "Failed to validate dashboard counts before incident report generation.",
      ) ?? [];

      const summary = summaryRows[0] ?? {
        total_households: 0,
        checked_in_count: 0,
        safe_count: 0,
        need_help_count: 0,
        unaccounted_count: 0,
        vulnerable_unaccounted: 0,
        sms_replied_count: 0,
      };

      try {
        const activeAlerts =
          getSupabaseDataOrThrow<
            Array<
              Pick<
                Alert,
                "source" | "severity" | "hazard_type" | "title" | "body" | "signal_level" | "issued_at"
              >
            >
          >(
            await ctx.supabase
              .from("alerts")
              .select("source, severity, hazard_type, title, body, signal_level, issued_at")
              .eq("is_active", true)
              .or(`barangay_id.eq.${barangayId},barangay_id.is.null`)
              .order("issued_at", { ascending: false })
              .limit(3),
            "Failed to load active alerts for incident report generation.",
          ) ?? [];

        const pendingNeeds =
          getSupabaseDataOrThrow<
            Array<
              Pick<
                NeedsReport,
                | "center_id"
                | "total_evacuees"
                | "needs_food_packs"
                | "needs_water_liters"
                | "needs_medicine"
                | "needs_blankets"
                | "medical_cases"
                | "status"
                | "submitted_at"
              >
            >
          >(
            await ctx.supabase
              .from("needs_reports")
              .select(
                "center_id, total_evacuees, needs_food_packs, needs_water_liters, needs_medicine, needs_blankets, medical_cases, status, submitted_at",
              )
              .eq("barangay_id", barangayId)
              .eq("status", "pending")
              .order("submitted_at", { ascending: false })
              .limit(5),
            "Failed to load pending needs for incident report generation.",
          ) ?? [];

        const barangay = getSupabaseDataOrThrow<{ name: string } | null>(
          await ctx.supabase
            .from("barangays")
            .select("name")
            .eq("id", barangayId)
            .maybeSingle(),
          "Failed to load barangay for incident report generation.",
        );

        const generated = await Promise.race([
          buildIncidentReportFromContext({
            barangayName: barangay?.name ?? "Unknown Barangay",
            summary,
            activeAlerts,
            pendingNeeds,
          }),
          timeoutPromise(8_000),
        ]);

        const insertPayload: TableInsert<"incident_reports"> = {
          barangay_id: getProfileBarangayIdOrThrow(ctx.profile),
          generated_by: ctx.session.id,
          title_english: generated.titleEnglish,
          title_filipino: generated.titleFilipino,
          body_english: generated.bodyEnglish,
          body_filipino: generated.bodyFilipino,
          next_steps_english: generated.nextStepsEnglish,
          next_steps_filipino: generated.nextStepsFilipino,
          dashboard_snapshot: summary,
          generation_source: "anthropic",
        };

        const report = getFoundOrThrow<IncidentReport | null>(
          getSupabaseDataOrThrow<IncidentReport | null>(
            await ctx.supabase
              .from("incident_reports")
              .insert(insertPayload)
              .select(reportColumns)
              .maybeSingle(),
            "Failed to save generated incident report.",
          ),
          "Incident report generation failed.",
        );

        return {
          report,
          usedCachedFallback: false,
          cachedMessage: null,
        };
      } catch (error) {
        try {
          const generated = await buildIncidentReportFromSummary(summary);

          const fallbackInsertPayload: TableInsert<"incident_reports"> = {
            barangay_id: getProfileBarangayIdOrThrow(ctx.profile),
            generated_by: ctx.session.id,
            title_english: generated.titleEnglish,
            title_filipino: generated.titleFilipino,
            body_english: generated.bodyEnglish,
            body_filipino: generated.bodyFilipino,
            next_steps_english: generated.nextStepsEnglish,
            next_steps_filipino: generated.nextStepsFilipino,
            dashboard_snapshot: summary,
            generation_source: "template_fallback",
          };

          const report = getFoundOrThrow<IncidentReport | null>(
            getSupabaseDataOrThrow<IncidentReport | null>(
              await ctx.supabase
                .from("incident_reports")
                .insert(fallbackInsertPayload)
                .select(reportColumns)
                .maybeSingle(),
              "Failed to save fallback incident report.",
            ),
            "Fallback incident report generation failed.",
          );

          return {
            report,
            usedCachedFallback: false,
            cachedMessage: "AI generation was unavailable. Generated a template fallback report.",
          };
        } catch {
          // Fall back to latest cached report only after both AI and template generation fail.
        }

        const fallbackReport = input.forceRefresh ? null : await getLatestIncidentReport(ctx, barangayId);

        if (fallbackReport) {
          return {
            report: fallbackReport,
            usedCachedFallback: true,
            cachedMessage: "Generation timed out. Showing latest cached report.",
          };
        }

        if (error instanceof Error) {
          throw ApiError.internal(error.message);
        }

        throw ApiError.internal("Incident report generation failed.");
      }
    }),

  list: officialProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<IncidentReport[]>(
        await ctx.supabase
          .from("incident_reports")
          .select(reportColumns)
          .eq("barangay_id", barangayId)
          .order("created_at", { ascending: false }),
        "Failed to list incident reports.",
      ) ?? [];
    }),

  getById: officialProcedure
    .input(
      z.object({
        id: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      return getFoundOrThrow<IncidentReport | null>(
        getSupabaseDataOrThrow<IncidentReport | null>(
          await ctx.supabase
            .from("incident_reports")
            .select(reportColumns)
            .eq("id", input.id)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to fetch incident report.",
        ),
        "Incident report not found.",
      );
    }),
});
