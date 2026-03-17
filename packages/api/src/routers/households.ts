

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getPaginationRange,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers.js";
import { officialProcedure, router } from "../index.js";
import type { Household } from "../supabase.js";
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
