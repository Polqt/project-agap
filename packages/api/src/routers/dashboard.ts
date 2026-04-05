import { z } from "zod";

import {
  getAuthorizedBarangayId,
  getProfileBarangayIdOrThrow,
  getProfileOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, protectedProcedure, router } from "../index";
import { barangayIdSchema, uuidSchema } from "../schemas";
import type { DashboardSummary, SmsFollowupItem } from "../supabase";


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

  heatmapData: protectedProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = input.barangayId ?? getProfileBarangayIdOrThrow(getProfileOrThrow(ctx.profile));

      // Count unresolved need_help pings, joined to household purok
      const { data: pings } = await ctx.supabase
        .from("status_pings")
        .select("household_id, households!inner(purok, latitude, longitude)")
        .eq("barangay_id", barangayId)
        .eq("status", "need_help")
        .eq("is_resolved", false);

      type PurokStat = {
        purok: string;
        count: number;
        // Approximate centroid: average of households in that purok
        latitude: number;
        longitude: number;
      };

      const purokMap = new Map<string, { count: number; lat: number; lng: number; points: number }>();

      for (const ping of pings ?? []) {
        const hh = (ping as unknown as { households: { purok: string; latitude: number; longitude: number } }).households;
        if (!hh?.purok) continue;
        const existing = purokMap.get(hh.purok) ?? { count: 0, lat: 0, lng: 0, points: 0 };
        purokMap.set(hh.purok, {
          count: existing.count + 1,
          lat: existing.lat + hh.latitude,
          lng: existing.lng + hh.longitude,
          points: existing.points + 1,
        });
      }

      const result: PurokStat[] = [];
      for (const [purok, stats] of purokMap.entries()) {
        if (stats.points === 0) continue;
        result.push({
          purok,
          count: stats.count,
          latitude: stats.lat / stats.points,
          longitude: stats.lng / stats.points,
        });
      }

      return result;
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
