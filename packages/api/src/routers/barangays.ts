import { z } from "zod";

import { getFoundOrThrow, getSupabaseDataOrThrow } from "../router-helpers";
import { publicProcedure, router } from "../index";
import { uuidSchema } from "../schemas.js";
import type { Barangay } from "../supabase";

/** Pilot barangay; keep in sync with packages/db/supabase/migrations/20260330120000_seed_barangay_banago.sql */
export const PILOT_BARANGAY_BANAGO_ID = "c0ffee00-baaa-4aaa-8aaa-0000bac0d001";

const barangayIdSchema = z.object({
  id: uuidSchema,
});

export const barangaysRouter = router({
  getById: publicProcedure.input(barangayIdSchema).query(async ({ ctx, input }) => {
    const barangay = getFoundOrThrow<Barangay | null>(
      getSupabaseDataOrThrow<Barangay | null>(
        await ctx.supabase
          .from("barangays")
          .select(
            "id, name, municipality, province, region, latitude, longitude, alert_level, active_alert_text, total_households, created_at, updated_at",
          )
          .eq("id", input.id)
          .maybeSingle(),
        "Failed to load barangay.",
      ),
      "Barangay not found.",
    );

    return barangay;
  }),

  listAll: publicProcedure.query(async ({ ctx }) => {
    const barangays = getSupabaseDataOrThrow<Barangay[]>(
      await ctx.supabase
        .from("barangays")
        .select(
          "id, name, municipality, province, region, latitude, longitude, alert_level, active_alert_text, total_households, created_at, updated_at",
        )
        .order("name", { ascending: true }),
      "Failed to list barangays.",
    ) ?? [];

    return [...barangays].sort((left, right) => {
      const leftPilot = left.id === PILOT_BARANGAY_BANAGO_ID ? 0 : 1;
      const rightPilot = right.id === PILOT_BARANGAY_BANAGO_ID ? 0 : 1;
      if (leftPilot !== rightPilot) {
        return leftPilot - rightPilot;
      }

      return left.name.localeCompare(right.name);
    });
  }),
});
