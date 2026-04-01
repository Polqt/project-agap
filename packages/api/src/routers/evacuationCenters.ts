import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, publicProcedure, router } from "../index";
import { locationSchema, uuidSchema } from "../schemas";
import type { EvacuationCenter, NearbyCenter } from "../supabase";

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
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
});
