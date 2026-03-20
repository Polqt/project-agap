import { z } from "zod";

import { getFoundOrThrow, getSupabaseDataOrThrow } from "../router-helpers";
import { publicProcedure, router } from "../index";
import type { Barangay } from "../supabase";

const barangayIdSchema = z.object({
  id: z.string().uuid(),
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

    return barangays;
  }),
});
