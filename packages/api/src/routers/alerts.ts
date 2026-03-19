import { z } from "zod";

import {
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers.js";
import { officialProcedure, publicProcedure, router } from "../index.js";
import { uuidSchema } from "../schemas.js";
import type { Alert, TableInsert } from "../supabase.js";

export const alertsRouter = router({
  getById: publicProcedure
    .input(
      z.object({
        id: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      return getFoundOrThrow<Alert | null>(
        getSupabaseDataOrThrow<Alert | null>(
          await ctx.supabase
            .from("alerts")
            .select(
              "id, barangay_id, source, severity, hazard_type, title, title_filipino, body, body_filipino, signal_level, recommended_actions, recommended_actions_filipino, source_url, issued_at, expires_at, is_active, external_id, created_at",
            )
            .eq("id", input.id)
            .maybeSingle(),
          "Failed to load alert.",
        ),
        "Alert not found.",
      );
    }),

  listActive: publicProcedure
    .input(
      z.object({
        barangayId: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      return getSupabaseDataOrThrow<Alert[]>(
        await ctx.supabase
          .from("alerts")
          .select(
            "id, barangay_id, source, severity, hazard_type, title, title_filipino, body, body_filipino, signal_level, recommended_actions, recommended_actions_filipino, source_url, issued_at, expires_at, is_active, external_id, created_at",
          )
          .eq("is_active", true)
          .or(`barangay_id.eq.${input.barangayId},barangay_id.is.null`)
          .order("issued_at", { ascending: false }),
        "Failed to list active alerts.",
      ) ?? [];
    }),

  createManual: officialProcedure
    .input(
      z.object({
        severity: z.enum(["info", "advisory", "watch", "warning", "danger"]).default("info"),
        hazardType: z.string().trim().min(1).max(100),
        title: z.string().trim().min(1).max(160),
        titleFilipino: z.string().trim().max(160).nullish(),
        body: z.string().trim().min(1).max(5000),
        bodyFilipino: z.string().trim().max(5000).nullish(),
        signalLevel: z.string().trim().max(100).nullish(),
        recommendedActions: z.string().trim().max(2000).nullish(),
        recommendedActionsFilipino: z.string().trim().max(2000).nullish(),
        sourceUrl: z.string().url().nullish(),
        issuedAt: z.string().datetime({ offset: true }).optional(),
        expiresAt: z.string().datetime({ offset: true }).nullish(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const insertPayload: TableInsert<"alerts"> = {
        barangay_id: getProfileBarangayIdOrThrow(ctx.profile),
        source: "manual",
        severity: input.severity,
        hazard_type: input.hazardType,
        title: input.title,
        title_filipino: input.titleFilipino ?? null,
        body: input.body,
        body_filipino: input.bodyFilipino ?? null,
        signal_level: input.signalLevel ?? null,
        recommended_actions: input.recommendedActions ?? null,
        recommended_actions_filipino: input.recommendedActionsFilipino ?? null,
        ...(input.sourceUrl !== undefined ? { source_url: input.sourceUrl } : {}),
        ...(input.issuedAt !== undefined ? { issued_at: input.issuedAt } : {}),
        ...(input.expiresAt !== undefined ? { expires_at: input.expiresAt } : {}),
        is_active: input.isActive,
      };

      const alert = getFoundOrThrow<Alert | null>(
        getSupabaseDataOrThrow<Alert | null>(
          await ctx.supabase
            .from("alerts")
            .insert(insertPayload)
            .select(
              "id, barangay_id, source, severity, hazard_type, title, title_filipino, body, body_filipino, signal_level, recommended_actions, recommended_actions_filipino, source_url, issued_at, expires_at, is_active, external_id, created_at",
            )
            .maybeSingle(),
          "Failed to create manual alert.",
        ),
        "Manual alert creation failed.",
      );

      return alert;
    }),
});
