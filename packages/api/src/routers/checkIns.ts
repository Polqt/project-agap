import { z } from "zod";

import {
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getProfileOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { protectedProcedure, router } from "../index";
import { locationSchema, uuidSchema } from "../schemas";
import type { CheckIn, CheckInByQrResult, TableInsert } from "../supabase";

export const checkInsRouter = router({
  byQr: protectedProcedure
    .input(
      z
        .object({
          qrToken: z.string().trim().min(1),
          householdId: uuidSchema.nullish(),
        })
        .merge(locationSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getProfileBarangayIdOrThrow(profile);

      if (input.householdId) {
        getFoundOrThrow<{ id: string } | null>(
          getSupabaseDataOrThrow<{ id: string } | null>(
            await ctx.supabase
              .from("households")
              .select("id")
              .eq("id", input.householdId)
              .eq("barangay_id", barangayId)
              .maybeSingle(),
            "Failed to validate household for QR check-in.",
          ),
          "Household not found.",
        );
      }

      const result = getFoundOrThrow<CheckInByQrResult | null>(
        getSupabaseDataOrThrow<CheckInByQrResult | null>(
          await ctx.supabase
            .rpc("checkin_by_qr", {
              p_qr_token: input.qrToken,
              p_resident_id: ctx.session.id,
              p_household_id: input.householdId ?? null,
              p_lat: input.latitude ?? null,
              p_lng: input.longitude ?? null,
            })
            .maybeSingle(),
          "Failed to complete QR check-in.",
        ),
        "QR check-in failed.",
      );

      return result;
    }),

  manual: protectedProcedure
    .input(
      z
        .object({
          centerId: uuidSchema,
          householdId: uuidSchema.nullish(),
          notes: z.string().trim().max(500).nullish(),
        })
        .merge(locationSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getProfileBarangayIdOrThrow(profile);

      getFoundOrThrow<{ id: string } | null>(
        getSupabaseDataOrThrow<{ id: string } | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .select("id")
            .eq("id", input.centerId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to validate evacuation center.",
        ),
        "Evacuation center not found.",
      );

      if (input.householdId) {
        getFoundOrThrow<{ id: string } | null>(
          getSupabaseDataOrThrow<{ id: string } | null>(
            await ctx.supabase
              .from("households")
              .select("id")
              .eq("id", input.householdId)
              .eq("barangay_id", barangayId)
              .maybeSingle(),
            "Failed to validate household for manual check-in.",
          ),
          "Household not found.",
        );
      }

      const insertPayload: TableInsert<"check_ins"> = {
        barangay_id: barangayId,
        center_id: input.centerId,
        resident_id: ctx.session.id,
        household_id: input.householdId ?? null,
        method: "manual",
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        notes: input.notes ?? null,
      };

      const checkIn = getFoundOrThrow<CheckIn | null>(
        getSupabaseDataOrThrow<CheckIn | null>(
          await ctx.supabase
            .from("check_ins")
            .insert(insertPayload)
            .select(
              "id, barangay_id, center_id, resident_id, household_id, method, checked_in_at, latitude, longitude, notes",
            )
            .maybeSingle(),
          "Failed to create manual check-in.",
        ),
        "Manual check-in failed.",
      );

      return checkIn;
    }),

  proxy: protectedProcedure
    .input(
      z
        .object({
          centerId: uuidSchema,
          householdId: uuidSchema,
          memberIds: z.array(uuidSchema).max(20).default([]),
          notes: z.string().trim().max(500).nullish(),
        })
        .merge(locationSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getProfileBarangayIdOrThrow(profile);

      getFoundOrThrow<{ id: string } | null>(
        getSupabaseDataOrThrow<{ id: string } | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .select("id")
            .eq("id", input.centerId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to validate evacuation center.",
        ),
        "Evacuation center not found.",
      );

      getFoundOrThrow<{ id: string } | null>(
        getSupabaseDataOrThrow<{ id: string } | null>(
          await ctx.supabase
            .from("households")
            .select("id")
            .eq("id", input.householdId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to validate household for proxy check-in.",
        ),
        "Household not found.",
      );

      const memberNotes =
        input.memberIds.length > 0
          ? `Proxy members: ${input.memberIds.join(", ")}`
          : null;

      const insertPayload: TableInsert<"check_ins"> = {
        barangay_id: barangayId,
        center_id: input.centerId,
        resident_id: ctx.session.id,
        household_id: input.householdId,
        method: "proxy",
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        notes: [input.notes ?? null, memberNotes].filter(Boolean).join("\n") || null,
      };

      const checkIn = getFoundOrThrow<CheckIn | null>(
        getSupabaseDataOrThrow<CheckIn | null>(
          await ctx.supabase
            .from("check_ins")
            .insert(insertPayload)
            .select(
              "id, barangay_id, center_id, resident_id, household_id, method, checked_in_at, latitude, longitude, notes",
            )
            .maybeSingle(),
          "Failed to create proxy check-in.",
        ),
        "Proxy check-in failed.",
      );

      return checkIn;
    }),
});
