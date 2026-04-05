import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";

import { assertNoUpdatedAtConflict } from "../conflicts";
import {
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, publicProcedure, router } from "../index";
import { locationSchema, uuidSchema } from "../schemas";
import type { CenterSupplies, EvacuationCenter, NearbyCenter } from "../supabase";
import { ApiError } from "../errors";

export const evacuationCentersRouter = router({
  listByBarangay: publicProcedure
    .input(
      z.object({
        barangayId: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      return getSupabaseDataOrThrow<EvacuationCenter[]>(
        await ctx.supabase
          .from("evacuation_centers")
          .select(
            "id, barangay_id, name, address, latitude, longitude, capacity, is_open, contact_number, notes, qr_code_token, current_occupancy, created_at, updated_at",
          )
          .eq("barangay_id", input.barangayId)
          .order("name", { ascending: true }),
        "Failed to list evacuation centers.",
      ) ?? [];
    }),

  getNearby: publicProcedure
    .input(
      z.object({
        barangayId: uuidSchema,
        radiusKm: z.number().positive().max(100).default(10),
      }).merge(
        locationSchema.extend({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      return getSupabaseDataOrThrow<NearbyCenter[]>(
        await ctx.supabase.rpc("get_nearby_centers", {
          p_barangay_id: input.barangayId,
          p_lat: input.latitude,
          p_lng: input.longitude,
          p_radius_km: input.radiusKm,
        }),
        "Failed to load nearby evacuation centers.",
      ) ?? [];
    }),

  toggleOpen: officialProcedure
    .input(
      z.object({
        centerId: uuidSchema,
        isOpen: z.boolean(),
        expectedUpdatedAt: z.string().datetime({ offset: true }).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const currentCenter = getFoundOrThrow<EvacuationCenter | null>(
        getSupabaseDataOrThrow<EvacuationCenter | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .select(
              "id, barangay_id, name, address, latitude, longitude, capacity, is_open, contact_number, notes, qr_code_token, current_occupancy, created_at, updated_at",
            )
            .eq("id", input.centerId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to load evacuation center.",
        ),
        "Evacuation center not found.",
      );

      assertNoUpdatedAtConflict({
        currentUpdatedAt: currentCenter.updated_at,
        expectedUpdatedAt: input.expectedUpdatedAt,
        conflictMessage:
          "Evacuation center availability was changed by another official. Refresh the dashboard before retrying.",
      });

      const center = getFoundOrThrow<EvacuationCenter | null>(
        getSupabaseDataOrThrow<EvacuationCenter | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .update({ is_open: input.isOpen })
            .eq("id", input.centerId)
            .eq("barangay_id", barangayId)
            .select(
              "id, barangay_id, name, address, latitude, longitude, capacity, is_open, contact_number, notes, qr_code_token, current_occupancy, created_at, updated_at",
            )
            .maybeSingle(),
          "Failed to update evacuation center.",
        ),
        "Evacuation center not found.",
      );

      return center;
    }),

  rotateQrToken: officialProcedure
    .input(
      z.object({
        centerId: uuidSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const center = getFoundOrThrow<EvacuationCenter | null>(
        getSupabaseDataOrThrow<EvacuationCenter | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .update({ qr_code_token: randomUUID() })
            .eq("id", input.centerId)
            .eq("barangay_id", barangayId)
            .select(
              "id, barangay_id, name, address, latitude, longitude, capacity, is_open, contact_number, notes, qr_code_token, current_occupancy, created_at, updated_at",
            )
            .maybeSingle(),
          "Failed to rotate center QR token.",
        ),
        "Evacuation center not found.",
      );

      return center;
    }),

  getSupplies: officialProcedure
    .input(z.object({ centerId: uuidSchema }))
    .query(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      // Verify center belongs to this barangay
      getFoundOrThrow<EvacuationCenter | null>(
        getSupabaseDataOrThrow<EvacuationCenter | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .select("id")
            .eq("id", input.centerId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to verify center.",
        ),
        "Center not found.",
      );

      const result = await ctx.supabase
        .from("center_supplies")
        .select("center_id, food_packs, water_liters, medicine_units, blankets, updated_at, updated_by")
        .eq("center_id", input.centerId)
        .maybeSingle();

      if (isMissingCenterSuppliesTable(result.error)) {
        return {
          center_id: input.centerId,
          food_packs: 0,
          water_liters: 0,
          medicine_units: 0,
          blankets: 0,
          updated_at: null,
          updated_by: null,
        };
      }

      const supplies = getSupabaseDataOrThrow<CenterSupplies | null>(
        result,
        "Failed to load center supplies.",
      );

      return supplies ?? {
        center_id: input.centerId,
        food_packs: 0,
        water_liters: 0,
        medicine_units: 0,
        blankets: 0,
        updated_at: null,
        updated_by: null,
      };
    }),

  updateSupplies: officialProcedure
    .input(
      z.object({
        centerId: uuidSchema,
        foodPacks: z.number().int().min(0).optional(),
        waterLiters: z.number().int().min(0).optional(),
        medicineUnits: z.number().int().min(0).optional(),
        blankets: z.number().int().min(0).optional(),
        expectedUpdatedAt: z.string().datetime({ offset: true }).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      getFoundOrThrow<EvacuationCenter | null>(
        getSupabaseDataOrThrow<EvacuationCenter | null>(
          await ctx.supabase
            .from("evacuation_centers")
            .select("id")
            .eq("id", input.centerId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to verify center.",
        ),
        "Center not found.",
      );

      const upsertPayload = {
        center_id: input.centerId,
        ...(input.foodPacks !== undefined ? { food_packs: input.foodPacks } : {}),
        ...(input.waterLiters !== undefined ? { water_liters: input.waterLiters } : {}),
        ...(input.medicineUnits !== undefined ? { medicine_units: input.medicineUnits } : {}),
        ...(input.blankets !== undefined ? { blankets: input.blankets } : {}),
        updated_at: new Date().toISOString(),
        updated_by: ctx.session.id,
      };

      const currentSuppliesResult = await ctx.supabase
        .from("center_supplies")
        .select("center_id, food_packs, water_liters, medicine_units, blankets, updated_at, updated_by")
        .eq("center_id", input.centerId)
        .maybeSingle();

      if (isMissingCenterSuppliesTable(currentSuppliesResult.error)) {
        throw ApiError.badRequest(
          "Center supplies are unavailable until the latest database migration is applied.",
        );
      }

      const currentSupplies = getSupabaseDataOrThrow<CenterSupplies | null>(
        currentSuppliesResult,
        "Failed to load current center supplies.",
      );

      assertNoUpdatedAtConflict({
        currentUpdatedAt: currentSupplies?.updated_at ?? null,
        expectedUpdatedAt: input.expectedUpdatedAt,
        conflictMessage:
          "Center supplies were updated by another official. Refresh the center card before saving again.",
      });

      const result = await ctx.supabase
        .from("center_supplies")
        .upsert(upsertPayload)
        .select("center_id, food_packs, water_liters, medicine_units, blankets, updated_at, updated_by")
        .maybeSingle();

      if (isMissingCenterSuppliesTable(result.error)) {
        throw ApiError.badRequest(
          "Center supplies are unavailable until the latest database migration is applied.",
        );
      }

      return getSupabaseDataOrThrow<CenterSupplies | null>(
        result,
        "Failed to update center supplies.",
      );
    }),
});

function isMissingCenterSuppliesTable(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}
