import { z } from "zod";

import { getFoundOrThrow, getSupabaseDataOrThrow } from "../router-helpers";
import { protectedProcedure, router } from "../index";
import { uuidSchema } from "../schemas";
import type { Profile } from "../supabase";

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
