import { z } from "zod";

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, router } from "../index";
import type { NeedsReport, TableInsert } from "../supabase";

const uuidSchema = z.string().uuid();

const allColumns =
  "id, barangay_id, center_id, submitted_by, total_evacuees, needs_food_packs, needs_water_liters, needs_medicine, needs_blankets, medical_cases, notes, status, acknowledged_by, acknowledged_at, submitted_at, updated_at";

export const needsReportsRouter = router({
  submit: officialProcedure
    .input(
      z.object({
        centerId: uuidSchema.optional(),
        totalEvacuees: z.number().int().min(0),
        needsFoodPacks: z.number().int().min(0),
        needsWaterLiters: z.number().int().min(0),
        needsMedicine: z.boolean(),
        needsBlankets: z.number().int().min(0),
        medicalCases: z.string().trim().max(1000).optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const insertPayload: TableInsert<"needs_reports"> = {
        barangay_id: getProfileBarangayIdOrThrow(ctx.profile),
        submitted_by: ctx.session.id,
        center_id: input.centerId ?? null,
        total_evacuees: input.totalEvacuees,
        needs_food_packs: input.needsFoodPacks,
        needs_water_liters: input.needsWaterLiters,
        needs_medicine: input.needsMedicine,
        needs_blankets: input.needsBlankets,
        medical_cases: input.medicalCases ?? null,
        notes: input.notes ?? null,
      };

      return getFoundOrThrow<NeedsReport | null>(
        getSupabaseDataOrThrow<NeedsReport | null>(
          await ctx.supabase
            .from("needs_reports")
            .insert(insertPayload)
            .select(allColumns)
            .maybeSingle(),
          "Failed to submit needs report.",
        ),
        "Needs report submission failed.",
      );
    }),

  list: officialProcedure
    .input(
      z.object({
        barangayId: uuidSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<NeedsReport[]>(
        await ctx.supabase
          .from("needs_reports")
          .select(allColumns)
          .eq("barangay_id", barangayId)
          .order("submitted_at", { ascending: false }),
        "Failed to list needs reports.",
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

      return getFoundOrThrow<NeedsReport | null>(
        getSupabaseDataOrThrow<NeedsReport | null>(
          await ctx.supabase
            .from("needs_reports")
            .select(allColumns)
            .eq("id", input.id)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to fetch needs report.",
        ),
        "Needs report not found.",
      );
    }),
});
