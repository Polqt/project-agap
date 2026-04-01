import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getProfileOrThrow,
  getPaginationRange,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { z } from "zod";
import { ApiError } from "../errors";
import { officialProcedure, protectedProcedure, router } from "../index";
import { barangayIdSchema, paginationSchema, uuidSchema, vulnerabilityFlagSchema } from "../schemas";
import type { Household, HouseholdMember, HouseholdWithMembers, TableInsert } from "../supabase";
import type { VulnerabilityFlag } from "../supabase/types";

const householdMemberInputSchema = z.object({
  id: uuidSchema.optional(),
  fullName: z.string().trim().min(1).max(160),
  age: z.number().int().min(0).max(130).nullable().optional(),
  vulnerabilityFlags: z.array(vulnerabilityFlagSchema).max(6).default([]),
  notes: z.string().trim().max(300).nullable().optional(),
});
const registerHouseholdSchema = z
  .object({
    householdHead: z.string().trim().min(2).max(160),
    purok: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(240),
    phoneNumber: z.string().trim().max(40).nullable().optional(),
    totalMembers: z.number().int().min(1).max(20),
    isSmsOnly: z.boolean().default(false),
    vulnerabilityFlags: z.array(vulnerabilityFlagSchema).max(6).default([]),
    members: z.array(householdMemberInputSchema).max(19).default([]),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const minimumMembers = value.members.length + 1;
    if (value.totalMembers < minimumMembers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total members must be at least ${minimumMembers}.`,
        path: ["totalMembers"],
      });
    }
  });

type HouseholdRecordWithMembers = Household & {
  household_members: HouseholdMember[] | null;
};

function getScopedBarangayId(
  profile: NonNullable<Parameters<typeof getProfileOrThrow>[0]>,
  requestedBarangayId?: string,
) {
  if (profile.role === "official") {
    return getAuthorizedBarangayId(profile, requestedBarangayId);
  }

  const barangayId = getProfileBarangayIdOrThrow(profile);
  if (requestedBarangayId && requestedBarangayId !== barangayId) {
    throw ApiError.forbidden("Residents can only access their own barangay data.");
  }

  return barangayId;
}

export const householdsRouter = router({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const profile = getProfileOrThrow(ctx.profile);
    const barangayId = getProfileBarangayIdOrThrow(profile);

    const household = getSupabaseDataOrThrow<HouseholdRecordWithMembers | null>(
      await ctx.supabase
        .from("households")
        .select(
          "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at, household_members(id, household_id, full_name, age, vulnerability_flags, notes, created_at)",
        )
        .eq("barangay_id", barangayId)
        .eq("registered_by", ctx.session.id)
        .maybeSingle(),
      "Failed to load household.",
    );

    if (!household) {
      return null;
    }

    return {
      ...household,
      household_members: household.household_members ?? [],
    } satisfies HouseholdWithMembers;
  }),

  getById: protectedProcedure
    .input(
      z.object({
        id: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getScopedBarangayId(profile);

      const household = getFoundOrThrow<HouseholdRecordWithMembers | null>(
        getSupabaseDataOrThrow<HouseholdRecordWithMembers | null>(
          await ctx.supabase
            .from("households")
            .select(
              "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at, household_members(id, household_id, full_name, age, vulnerability_flags, notes, created_at)",
            )
            .eq("id", input.id)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to load household.",
        ),
        "Household not found.",
      );

      return {
        ...household,
        household_members: household.household_members ?? [],
      } satisfies HouseholdWithMembers;
    }),

  register: protectedProcedure
    .input(registerHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getProfileBarangayIdOrThrow(profile);

      const existingHousehold = getSupabaseDataOrThrow<{ id: string } | null>(
        await ctx.supabase
          .from("households")
          .select("id")
          .eq("barangay_id", barangayId)
          .eq("registered_by", ctx.session.id)
          .maybeSingle(),
        "Failed to load existing household.",
      );

      const basePayload: TableInsert<"households"> = {
        barangay_id: barangayId,
        registered_by: ctx.session.id,
        household_head: input.householdHead,
        purok: input.purok,
        address: input.address,
        phone_number: input.phoneNumber ?? null,
        total_members: input.totalMembers,
        vulnerability_flags: input.vulnerabilityFlags as VulnerabilityFlag[],
        is_sms_only: input.isSmsOnly,
        notes: input.notes ?? null,
      };

      const household = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          existingHousehold
            ? await ctx.supabase
                .from("households")
                .update(basePayload)
                .eq("id", existingHousehold.id)
                .eq("registered_by", ctx.session.id)
                .select(
                  "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at",
                )
                .maybeSingle()
            : await ctx.supabase
                .from("households")
                .insert(basePayload)
                .select(
                  "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at",
                )
                .maybeSingle(),
          "Failed to save household.",
        ),
        "Household could not be saved.",
      );

      getSupabaseDataOrThrow<HouseholdMember[]>(
        await ctx.supabase.from("household_members").delete().eq("household_id", household.id),
        "Failed to refresh household members.",
      );

      if (input.members.length > 0) {
        const memberPayload: TableInsert<"household_members">[] = input.members.map((member) => ({
          household_id: household.id,
          full_name: member.fullName,
          age: member.age ?? null,
          vulnerability_flags: member.vulnerabilityFlags as VulnerabilityFlag[],
          notes: member.notes ?? null,
        }));

        getSupabaseDataOrThrow<HouseholdMember[]>(
          await ctx.supabase.from("household_members").insert(memberPayload),
          "Failed to save household members.",
        );
      }

      const members =
        getSupabaseDataOrThrow<HouseholdMember[]>(
          await ctx.supabase
            .from("household_members")
            .select("id, household_id, full_name, age, vulnerability_flags, notes, created_at")
            .eq("household_id", household.id)
            .order("created_at", { ascending: true }),
          "Failed to load household members.",
        ) ?? [];

      return {
        ...household,
        household_members: members,
      } satisfies HouseholdWithMembers;
    }),

  list: officialProcedure
    .input(barangayIdSchema.merge(paginationSchema))
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

  search: protectedProcedure
    .input(
      barangayIdSchema.extend({
        query: z.string().trim().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getScopedBarangayId(profile, input.barangayId);

      return getSupabaseDataOrThrow<Household[]>(
        await ctx.supabase.rpc("search_households", {
          p_barangay_id: barangayId,
          p_query: input.query,
        }),
        "Failed to search households.",
      ) ?? [];
    }),

  getUnaccounted: officialProcedure
    .input(barangayIdSchema)
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
          "welfare_check_dispatched",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const nextStatus =
        input.evacuationStatus === "welfare_check_dispatched"
          ? "need_help"
          : input.evacuationStatus;
      const household = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          await ctx.supabase
            .from("households")
            .update({
              evacuation_status: nextStatus,
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
