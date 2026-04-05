import { z } from "zod";

import { getFoundOrThrow, getSupabaseDataOrThrow } from "../router-helpers";
import { protectedProcedure, router } from "../index";
import { ApiError } from "../errors";
import { uuidSchema } from "../schemas";
import type { Profile } from "../supabase";

const pinnedLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(160).optional(),
    phoneNumber: z.string().trim().min(1).max(40).nullable().optional(),
    barangayId: uuidSchema.nullable().optional(),
    purok: z.string().trim().min(1).max(120).nullable().optional(),
    isSmsOnly: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.fullName !== undefined ||
      value.phoneNumber !== undefined ||
      value.barangayId !== undefined ||
      value.purok !== undefined ||
      value.isSmsOnly !== undefined,
    {
      message: "At least one field must be provided.",
    },
  );

export const profileRouter = router({
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const profile = getFoundOrThrow<Profile | null>(
      getSupabaseDataOrThrow<Profile | null>(
        await ctx.supabase
          .from("profiles")
          .select(
            "id, role, full_name, phone_number, barangay_id, purok, is_sms_only, created_at, updated_at",
          )
          .eq("id", ctx.session.id)
          .maybeSingle(),
        "Failed to load profile.",
      ),
      "Profile not found.",
    );

    return profile;
  }),

  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const updatePayload = {
        ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
        ...(input.phoneNumber !== undefined ? { phone_number: input.phoneNumber } : {}),
        ...(input.barangayId !== undefined ? { barangay_id: input.barangayId } : {}),
        ...(input.purok !== undefined ? { purok: input.purok } : {}),
        ...(input.isSmsOnly !== undefined ? { is_sms_only: input.isSmsOnly } : {}),
      };

      const profile = getFoundOrThrow<Profile | null>(
        getSupabaseDataOrThrow<Profile | null>(
          await ctx.supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", ctx.session.id)
            .select(
              "id, role, full_name, phone_number, barangay_id, purok, is_sms_only, created_at, updated_at",
            )
            .maybeSingle(),
          "Failed to update profile.",
        ),
        "Profile not found.",
      );

      return profile;
    }),

  getPinnedLocation: protectedProcedure.query(async ({ ctx }) => {
    const profile = getFoundOrThrow<{
      pinned_latitude: number | null;
      pinned_longitude: number | null;
      pinned_at: string | null;
    } | null>(
      getSupabaseDataOrThrow<{
        pinned_latitude: number | null;
        pinned_longitude: number | null;
        pinned_at: string | null;
      } | null>(
        await ctx.supabase
          .from("profiles")
          .select("pinned_latitude, pinned_longitude, pinned_at")
          .eq("id", ctx.session.id)
          .maybeSingle(),
        "Failed to load pinned location.",
      ),
      "Profile not found.",
    );

    if (profile.pinned_latitude === null || profile.pinned_longitude === null) {
      return null;
    }

    return {
      latitude: profile.pinned_latitude,
      longitude: profile.pinned_longitude,
      pinnedAt: profile.pinned_at,
    };
  }),

  setPinnedLocation: protectedProcedure
    .input(pinnedLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = getFoundOrThrow<{
        pinned_latitude: number | null;
        pinned_longitude: number | null;
        pinned_at: string | null;
      } | null>(
        getSupabaseDataOrThrow<{
          pinned_latitude: number | null;
          pinned_longitude: number | null;
          pinned_at: string | null;
        } | null>(
          await ctx.supabase
            .from("profiles")
            .update({
              pinned_latitude: input.latitude,
              pinned_longitude: input.longitude,
              pinned_at: new Date().toISOString(),
            })
            .eq("id", ctx.session.id)
            .select("pinned_latitude, pinned_longitude, pinned_at")
            .maybeSingle(),
          "Failed to save pinned location.",
        ),
        "Profile not found.",
      );

      if (profile.pinned_latitude === null || profile.pinned_longitude === null) {
        throw ApiError.internal("Pinned location did not save correctly.");
      }

      return {
        latitude: profile.pinned_latitude,
        longitude: profile.pinned_longitude,
        pinnedAt: profile.pinned_at,
      };
    }),

  clearPinnedLocation: protectedProcedure.mutation(async ({ ctx }) => {
    getFoundOrThrow<{ id: string } | null>(
      getSupabaseDataOrThrow<{ id: string } | null>(
        await ctx.supabase
          .from("profiles")
          .update({
            pinned_latitude: null,
            pinned_longitude: null,
            pinned_at: null,
          })
          .eq("id", ctx.session.id)
          .select("id")
          .maybeSingle(),
        "Failed to clear pinned location.",
      ),
      "Profile not found.",
    );

    return {
      success: true,
    };
  }),

  upsertPushToken: protectedProcedure
    .input(
      z.object({
        token: z.string().trim().min(1),
        platform: z.enum(["ios", "android"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      getSupabaseDataOrThrow<null>(
        await ctx.supabase.rpc("upsert_push_token", {
          p_token: input.token,
          p_platform: input.platform,
        }),
        "Failed to upsert push token.",
      );

      return {
        success: true,
        token: input.token,
      };
    }),

  deactivatePushToken: protectedProcedure
    .input(z.object({ token: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from("push_tokens")
        .update({ is_active: false })
        .eq("token", input.token)
        .eq("resident_id", ctx.session.id);

      return { success: true };
    }),
});
