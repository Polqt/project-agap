import { z } from "zod";

import { getAuthorizedBarangayId, getSupabaseDataOrThrow } from "../router-helpers";
import { officialProcedure, router } from "../index";
import { barangayIdSchema, uuidSchema } from "../schemas";
import type { DashboardSummary, SmsFollowupItem, TableRow } from "../supabase";

type ResidentHeatmapProfile = Pick<
  TableRow<"profiles">,
  "id" | "pinned_latitude" | "pinned_longitude"
>;

export const dashboardRouter = router({
  summary: officialProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);
      const rows = getSupabaseDataOrThrow<DashboardSummary[]>(
        await ctx.supabase.rpc("get_dashboard_summary", {
          p_barangay_id: barangayId,
        }),
        "Failed to load dashboard summary.",
      ) ?? [];

      return rows[0] ?? {
        total_households: 0,
        checked_in_count: 0,
        safe_count: 0,
        need_help_count: 0,
        unaccounted_count: 0,
        vulnerable_unaccounted: 0,
        sms_replied_count: 0,
      };
    }),

  residentHeatmap: officialProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      const profiles =
        getSupabaseDataOrThrow<ResidentHeatmapProfile[]>(
          await ctx.supabase
            .from("profiles")
            .select("id, pinned_latitude, pinned_longitude")
            .eq("barangay_id", barangayId)
            .eq("role", "resident")
            .not("pinned_latitude", "is", null)
            .not("pinned_longitude", "is", null),
          "Failed to load resident heatmap points.",
        ) ?? [];

      return profiles.flatMap((profile) => {
        if (profile.pinned_latitude === null || profile.pinned_longitude === null) {
          return [];
        }

        return [
          {
            resident_id: profile.id,
            latitude: profile.pinned_latitude,
            longitude: profile.pinned_longitude,
          },
        ];
      });
    }),

  smsFollowup: officialProcedure
    .input(
      barangayIdSchema.extend({
        broadcastId: uuidSchema,
        minutesThreshold: z.number().int().positive().max(1440).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<SmsFollowupItem[]>(
        await ctx.supabase.rpc("get_sms_followup_list", {
          p_barangay_id: barangayId,
          p_broadcast_id: input.broadcastId,
          p_minutes_threshold: input.minutesThreshold,
        }),
        "Failed to load SMS follow-up list.",
      ) ?? [];
    }),
});
