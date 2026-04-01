

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getPaginationRange,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, router } from "../index";
import type { Household, TableInsert } from "../supabase";
import { z } from "zod";

const uuidSchema = z.string().uuid();
const barangayInputSchema = z.object({
  barangayId: uuidSchema.optional(),
});

export const householdsRouter = router({
  list: officialProcedure
    .input(
      barangayInputSchema.extend({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);
      const { from, to } = getPaginationRange(input.page, input.pageSize);

      const query = await ctx.supabase
        .from("households")
        .select(
          "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at",
          { count: "exact" },
        )
        .eq("barangay_id", barangayId)
        .order("household_head", { ascending: true })
        .range(from, to);

      const households = getSupabaseDataOrThrow<Household[]>(query, "Failed to list households.") ?? [];

      return {
        items: households,
        page: input.page,
        pageSize: input.pageSize,
        totalCount: query.count ?? 0,
      };
    }),

  search: officialProcedure
    .input(
      barangayInputSchema.extend({
        query: z.string().trim().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<Household[]>(
        await ctx.supabase.rpc("search_households", {
          p_barangay_id: barangayId,
          p_query: input.query,
        }),
        "Failed to search households.",
      ) ?? [];
    }),

  getUnaccounted: officialProcedure
    .input(barangayInputSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<Household[]>(
        await ctx.supabase.rpc("get_unaccounted_households", {
          p_barangay_id: barangayId,
        }),
        "Failed to load unaccounted households.",
      ) ?? [];
    }),

  upsert: officialProcedure
    .input(
      z.object({
        id: uuidSchema.optional(),
        householdHead: z.string().trim().min(1),
        purok: z.string().trim().min(1),
        address: z.string().trim().optional(),
        phoneNumber: z.string().trim().optional(),
        totalMembers: z.number().int().min(1),
        vulnerabilityFlags: z.array(
          z.enum(["elderly", "pwd", "infant", "pregnant", "solo_parent", "chronic_illness"]),
        ),
        isSmsOnly: z.boolean(),
        notes: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      if (input.id) {
        const household = getFoundOrThrow<Household | null>(
          getSupabaseDataOrThrow<Household | null>(
            await ctx.supabase
              .from("households")
              .update({
                household_head: input.householdHead,
                purok: input.purok,
                address: input.address ?? "",
                phone_number: input.phoneNumber ?? null,
                total_members: input.totalMembers,
                vulnerability_flags: input.vulnerabilityFlags,
                is_sms_only: input.isSmsOnly,
                notes: input.notes ?? null,
              })
              .eq("id", input.id)
              .eq("barangay_id", barangayId)
              .select(
                "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at",
              )
              .maybeSingle(),
            "Failed to update household.",
          ),
          "Household not found.",
        );

        return household;
      }

      const insertPayload: TableInsert<"households"> = {
        barangay_id: barangayId,
        registered_by: ctx.session.id,
        household_head: input.householdHead,
        purok: input.purok,
        address: input.address ?? "",
        phone_number: input.phoneNumber ?? null,
        total_members: input.totalMembers,
        vulnerability_flags: input.vulnerabilityFlags,
        is_sms_only: input.isSmsOnly,
        notes: input.notes ?? null,
      };

      const household = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          await ctx.supabase
            .from("households")
            .insert(insertPayload)
            .select(
              "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at",
            )
            .maybeSingle(),
          "Failed to create household.",
        ),
        "Household creation failed.",
      );

      return household;
    }),

  delete: officialProcedure
    .input(
      z.object({
        householdId: uuidSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      getSupabaseDataOrThrow<null>(
        await ctx.supabase
          .from("households")
          .delete()
          .eq("id", input.householdId)
          .eq("barangay_id", barangayId),
        "Failed to delete household.",
      );

      return { success: true };
    }),

  updateStatus: officialProcedure
    .input(
      z.object({
        householdId: uuidSchema,
        evacuationStatus: z.enum([
          "home",
          "evacuating",
          "checked_in",
          "safe",
          "need_help",
          "unknown",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const household = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          await ctx.supabase
            .from("households")
            .update({
              evacuation_status: input.evacuationStatus,
            })
            .eq("id", input.householdId)
            .eq("barangay_id", barangayId)
            .select(
              "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at",
            )
            .maybeSingle(),
          "Failed to update household status.",
        ),
        "Household not found.",
      );

      return household;
    }),
});
