import { z } from "zod";

import {
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers.js";
import { officialProcedure, router } from "../index.js";
import { uuidSchema } from "../schemas.js";
import type { NeedsReport } from "../supabase.js";

const reportSchema = z.object({
  center_id: uuidSchema.optional(),
  total_evacuees: z.number().int().min(0),
  needs_food_packs: z.number().int().min(0).default(0),
  needs_water_liters: z.number().int().min(0).default(0),
  needs_medicine: z.boolean().default(false),
  needs_blankets: z.number().int().min(0).default(0),
  medical_cases: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export const needsReportsRouter = router({
  submit: officialProcedure.input(reportSchema).mutation(async ({ ctx, input }) => {
    const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

    if (input.center_id) {
      getFoundOrThrow<{ id: string } | null>(
        getSupabaseDataOrThrow<{ id: string } | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .select("id")
            .eq("id", input.center_id)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to validate evacuation center.",
        ),
        "Evacuation center not found.",
      );
    }

    return getFoundOrThrow(
      getSupabaseDataOrThrow<NeedsReport | null>(
        await ctx.supabase
          .from("needs_reports")
          .insert({ ...input, barangay_id: barangayId, submitted_by: ctx.session.id })
          .select(
            "id, barangay_id, center_id, submitted_by, total_evacuees, needs_food_packs, needs_water_liters, needs_medicine, needs_blankets, medical_cases, notes, status, acknowledged_by, acknowledged_at, submitted_at, updated_at",
          )
          .maybeSingle(),
        "Failed to submit needs report.",
      ),
      "Needs report submission failed.",
    );
  }),

  list: officialProcedure.query(async ({ ctx }) => {
    const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

    return (
      getSupabaseDataOrThrow<NeedsReport[]>(
        await ctx.supabase
          .from("needs_reports")
          .select(
            "id, barangay_id, center_id, submitted_by, total_evacuees, needs_food_packs, needs_water_liters, needs_medicine, needs_blankets, medical_cases, notes, status, acknowledged_by, acknowledged_at, submitted_at, updated_at",
          )
          .eq("barangay_id", barangayId)
          .order("submitted_at", { ascending: false }),
        "Failed to list needs reports.",
      ) ?? []
    );
  }),
});
