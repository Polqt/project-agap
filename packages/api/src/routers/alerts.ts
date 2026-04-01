import { z } from "zod";

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { ApiError } from "../errors";
import { officialProcedure, protectedProcedure, router } from "../index";
import { uuidSchema } from "../schemas";
import type { Alert, TableInsert } from "../supabase";

const alertColumns =
  "id, barangay_id, source, severity, hazard_type, title, title_filipino, body, body_filipino, signal_level, recommended_actions, recommended_actions_filipino, source_url, issued_at, expires_at, is_active, external_id, created_at";

function isAlertExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() < Date.now();
}

function isAlertVisibleToBarangay(alert: Alert, barangayId: string) {
  if (!alert.is_active || isAlertExpired(alert.expires_at)) {
    return false;
  }

  return alert.barangay_id === null || alert.barangay_id === barangayId;
}

export const alertsRouter = router({
  getById: protectedProcedure
    .input(
      z.object({
        id: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getProfileBarangayIdOrThrow(profile);

      const alert = getFoundOrThrow<Alert | null>(
        getSupabaseDataOrThrow<Alert | null>(
          await ctx.supabase
            .from("alerts")
            .select(alertColumns)
            .eq("id", input.id)
            .maybeSingle(),
          "Failed to load alert.",
        ),
        "Alert not found.",
      );

      if (!isAlertVisibleToBarangay(alert, barangayId)) {
        throw ApiError.notFound("Alert not found.");
      }

      return alert;
    }),

  listActive: protectedProcedure
    .input(
      z.object({
        barangayId: uuidSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getAuthorizedBarangayId(profile, input.barangayId);

      const alerts =
        getSupabaseDataOrThrow<Alert[]>(
        await ctx.supabase
          .from("alerts")
          .select(alertColumns)
          .eq("is_active", true)
          .or(`barangay_id.eq.${barangayId},barangay_id.is.null`)
          .order("issued_at", { ascending: false }),
        "Failed to list active alerts.",
        ) ?? [];

      return alerts.filter((alert) => !isAlertExpired(alert.expires_at));
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
            .select(alertColumns)
            .maybeSingle(),
          "Failed to create manual alert.",
        ),
        "Manual alert creation failed.",
      );

      return alert;
    }),
});
