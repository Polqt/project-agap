import { z } from "zod";

import { ApiError } from "../errors";
import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getProfileOrThrow,
  getPaginationRange,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, protectedProcedure, router } from "../index";
import {
  barangayIdSchema,
  paginationSchema,
  uuidSchema,
  vulnerabilityFlagSchema,
} from "../schemas";
import { sendSms } from "../textbee";
import type {
  Household,
  HouseholdMember,
  HouseholdWithMembers,
  TableInsert,
  WelfareDispatchQueueItem,
} from "../supabase";
import type { EvacuationStatus, VulnerabilityFlag } from "../supabase/types";

const householdResidentSelect =
  "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, created_at, updated_at";

const householdBaseSelect = `${householdResidentSelect}, welfare_assigned_profile_id, welfare_assigned_at`;

function isMissingWelfareColumnsError(error: { message?: string | null } | null) {
  const message = error?.message ?? "";
  return message.includes("welfare_assigned_profile_id") || message.includes("welfare_assigned_at");
}

async function runHouseholdQueryWithFallback<T>(
  primary: () => Promise<unknown>,
  fallback: () => Promise<unknown>,
  errorMessage: string,
) {
  let response = (await primary()) as {
    data: T | null;
    error: { message?: string | null } | null;
  };

  if (response.error && isMissingWelfareColumnsError(response.error)) {
    response = (await fallback()) as {
      data: T | null;
      error: { message?: string | null } | null;
    };
  }

  return getSupabaseDataOrThrow<T | null>(response as never, errorMessage);
}

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

function appendRedispatchNote(existing: string | null) {
  const tag = "[Welfare: redispatch requested]";
  if (existing?.includes(tag)) {
    return existing;
  }
  const base = existing?.trim() ? `${existing.trim()}\n` : "";
  return `${base}${tag}`;
}

const STATUS_UPDATE_TEMPLATES = {
  help_acknowledged: {
    label: "Need help acknowledged",
    filipino:
      "Natanggap na ng Barangay Response Team ang inyong NEED HELP status at inaalam na ang pinakamabilis na responde.",
    english:
      "The Barangay Response Team has received your NEED HELP status and is coordinating the fastest response.",
  },
  team_dispatched: {
    label: "Team dispatched",
    filipino:
      "May welfare/rescue team nang ipinadala sa inyong lokasyon. Manatili sa ligtas na lugar habang hinihintay ang team.",
    english:
      "A welfare/rescue team has been dispatched to your location. Please stay in a safe place while waiting for the team.",
  },
  safe_confirmed: {
    label: "Safe confirmed",
    filipino:
      "Na-update na ang inyong household status bilang LIGTAS. Salamat sa mabilis na update.",
    english:
      "Your household status has been updated to SAFE. Thank you for the quick update.",
  },
} as const;

type StatusUpdateTemplateKey = keyof typeof STATUS_UPDATE_TEMPLATES;

function formatStatusLabel(status: EvacuationStatus) {
  if (status === "safe") return "SAFE";
  if (status === "need_help") return "NEED HELP";
  if (status === "welfare_check_dispatched") return "WELFARE CHECK DISPATCHED";
  if (status === "checked_in") return "CHECKED IN";
  if (status === "evacuating") return "EVACUATING";
  if (status === "not_home") return "NOT HOME";
  if (status === "home") return "HOME";
  return "UNACCOUNTED";
}

function mapEvacuationStatusToPingStatus(status: EvacuationStatus): "safe" | "need_help" {
  if (status === "safe" || status === "checked_in") {
    return "safe";
  }

  return "need_help";
}

function buildStatusUpdateMessage(input: {
  householdHead: string;
  evacuationStatus: EvacuationStatus;
  templateKey: StatusUpdateTemplateKey;
  note?: string | null;
}) {
  const template = STATUS_UPDATE_TEMPLATES[input.templateKey];
  const note = input.note?.trim();
  const noteLine = note ? `\n\nNote: ${note}` : "";

  return (
    `[Project AGAP] ${template.filipino}\n\n` +
    `${template.english}\n\n` +
    `Status: ${formatStatusLabel(input.evacuationStatus)}\n` +
    `Recipient: ${input.householdHead}${noteLine}`
  );
}

function getDefaultTemplateForStatus(status: EvacuationStatus): StatusUpdateTemplateKey {
  if (status === "safe" || status === "checked_in") {
    return "safe_confirmed";
  }

  if (status === "welfare_check_dispatched") {
    return "team_dispatched";
  }

  return "help_acknowledged";
}

export const householdsRouter = router({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const profile = getProfileOrThrow(ctx.profile);
    const barangayId = getProfileBarangayIdOrThrow(profile);

    const household = await runHouseholdQueryWithFallback<HouseholdRecordWithMembers>(
      async () =>
        await ctx.supabase
          .from("households")
          .select(
            `${householdBaseSelect}, household_members(id, household_id, full_name, age, vulnerability_flags, notes, created_at)`,
          )
          .eq("barangay_id", barangayId)
          .eq("registered_by", ctx.session.id)
          .maybeSingle(),
      async () =>
        await ctx.supabase
          .from("households")
          .select(
            `${householdResidentSelect}, household_members(id, household_id, full_name, age, vulnerability_flags, notes, created_at)`,
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
        await runHouseholdQueryWithFallback<HouseholdRecordWithMembers>(
          async () =>
            await ctx.supabase
              .from("households")
              .select(
                `${householdBaseSelect}, household_members(id, household_id, full_name, age, vulnerability_flags, notes, created_at)`,
              )
              .eq("id", input.id)
              .eq("barangay_id", barangayId)
              .maybeSingle(),
          async () =>
            await ctx.supabase
              .from("households")
              .select(
                `${householdResidentSelect}, household_members(id, household_id, full_name, age, vulnerability_flags, notes, created_at)`,
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
        await runHouseholdQueryWithFallback<Household>(
          async () =>
            existingHousehold
              ? await ctx.supabase
                  .from("households")
                  .update(basePayload)
                  .eq("id", existingHousehold.id)
                  .eq("registered_by", ctx.session.id)
                  .select(householdBaseSelect)
                  .maybeSingle()
              : await ctx.supabase
                  .from("households")
                  .insert(basePayload)
                  .select(householdBaseSelect)
                  .maybeSingle(),
          async () =>
            existingHousehold
              ? await ctx.supabase
                  .from("households")
                  .update(basePayload)
                  .eq("id", existingHousehold.id)
                  .eq("registered_by", ctx.session.id)
                  .select(householdResidentSelect)
                  .maybeSingle()
              : await ctx.supabase
                  .from("households")
                  .insert(basePayload)
                  .select(householdResidentSelect)
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
        .select(householdBaseSelect, { count: "exact" })
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

  listWelfareDispatchQueue: officialProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      const rows =
        getSupabaseDataOrThrow<WelfareDispatchQueueItem[]>(
          await ctx.supabase.rpc("get_welfare_dispatch_queue", {
            p_barangay_id: barangayId,
          }),
          "Failed to load welfare dispatch queue.",
        ) ?? [];

      return rows;
    }),

  listMyWelfareAssignments: officialProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<Household[]>(
        await ctx.supabase
          .from("households")
          .select(householdBaseSelect)
          .eq("barangay_id", barangayId)
          .eq("welfare_assigned_profile_id", ctx.session.id)
          .eq("evacuation_status", "welfare_check_dispatched")
          .order("welfare_assigned_at", { ascending: true, nullsFirst: false })
          .order("household_head", { ascending: true }),
        "Failed to load welfare assignments.",
      ) ?? [];
    }),

  assignWelfareVisit: officialProcedure
    .input(
      z.object({
        householdId: uuidSchema,
        assigneeProfileId: uuidSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const assigneeId = input.assigneeProfileId ?? ctx.session.id;

      const assignee = getFoundOrThrow(
        getSupabaseDataOrThrow<{ id: string; role: string; barangay_id: string | null } | null>(
          await ctx.supabase
            .from("profiles")
            .select("id, role, barangay_id")
            .eq("id", assigneeId)
            .maybeSingle(),
          "Failed to validate assignee.",
        ),
        "Assignee not found.",
      );

      if (assignee.role !== "official" || assignee.barangay_id !== barangayId) {
        throw ApiError.forbidden("Assignee must be an official in this barangay.");
      }

      const now = new Date().toISOString();
      const household = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          await ctx.supabase
            .from("households")
            .update({
              evacuation_status: "welfare_check_dispatched",
              welfare_assigned_profile_id: assigneeId,
              welfare_assigned_at: now,
            })
            .eq("id", input.householdId)
            .eq("barangay_id", barangayId)
            .select(householdBaseSelect)
            .maybeSingle(),
          "Failed to assign welfare visit.",
        ),
        "Household not found.",
      );

      return household;
    }),

  recordWelfareOutcome: officialProcedure
    .input(
      z.object({
        householdId: uuidSchema,
        outcome: z.enum(["safe", "need_help", "not_home", "dispatch_again"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      const current = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          await ctx.supabase
            .from("households")
            .select(householdBaseSelect)
            .eq("id", input.householdId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to load household.",
        ),
        "Household not found.",
      );

      if (current.evacuation_status !== "welfare_check_dispatched") {
        throw ApiError.badRequest("Household is not in welfare dispatch status.");
      }

      let nextStatus: EvacuationStatus;
      let notes = current.notes;
      const clearWelfare = {
        welfare_assigned_profile_id: null as string | null,
        welfare_assigned_at: null as string | null,
      };

      switch (input.outcome) {
        case "safe":
          nextStatus = "safe";
          break;
        case "need_help":
          nextStatus = "need_help";
          break;
        case "not_home":
          nextStatus = "not_home";
          break;
        case "dispatch_again":
          nextStatus = "unknown";
          notes = appendRedispatchNote(current.notes);
          break;
        default:
          throw ApiError.badRequest("Invalid outcome.");
      }

      const household = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          await ctx.supabase
            .from("households")
            .update({
              evacuation_status: nextStatus,
              notes,
              ...clearWelfare,
            })
            .eq("id", input.householdId)
            .eq("barangay_id", barangayId)
            .select(householdBaseSelect)
            .maybeSingle(),
          "Failed to record welfare outcome.",
        ),
        "Household not found.",
      );

      return household;
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
              .select(householdBaseSelect)
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
            .select(householdBaseSelect)
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
          "not_home",
          "welfare_check_dispatched",
        ]),
        notifyBySms: z.boolean().default(true),
        notifyInApp: z.boolean().default(true),
        smsTemplate: z.enum(["help_acknowledged", "team_dispatched", "safe_confirmed"]).optional(),
        note: z.string().trim().max(500).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const now = new Date().toISOString();

      const patch =
        input.evacuationStatus === "welfare_check_dispatched"
          ? {
              evacuation_status: input.evacuationStatus as EvacuationStatus,
              welfare_assigned_profile_id: ctx.session.id,
              welfare_assigned_at: now,
            }
          : {
              evacuation_status: input.evacuationStatus as EvacuationStatus,
              welfare_assigned_profile_id: null,
              welfare_assigned_at: null,
            };

      const household = getFoundOrThrow<Household | null>(
        getSupabaseDataOrThrow<Household | null>(
          await ctx.supabase
            .from("households")
            .update(patch)
            .eq("id", input.householdId)
            .eq("barangay_id", barangayId)
            .select(householdBaseSelect)
            .maybeSingle(),
          "Failed to update household status.",
        ),
        "Household not found.",
      );

      const templateKey =
        input.smsTemplate ?? getDefaultTemplateForStatus(input.evacuationStatus as EvacuationStatus);

      const statusMessage = buildStatusUpdateMessage({
        householdHead: household.household_head,
        evacuationStatus: input.evacuationStatus as EvacuationStatus,
        templateKey,
        note: input.note ?? null,
      });

      let smsSent = false;
      let smsAttempted = false;
      let smsError: string | null = null;
      let appNotified = false;
      let appError: string | null = null;

      if (input.notifyBySms && household.phone_number) {
        smsAttempted = true;
        const smsResult = await sendSms(household.phone_number, statusMessage);
        smsError = smsResult.success ? null : (smsResult.error ?? "SMS gateway returned an unknown error.");

        const smsLogInsert: TableInsert<"sms_logs"> = {
          barangay_id: barangayId,
          household_id: household.id,
          broadcast_id: null,
          direction: "outbound",
          phone_number: household.phone_number,
          message: statusMessage,
          delivery_status: smsResult.success ? "sent" : "failed",
          gateway_message_id: smsResult.messageId ?? null,
          error_message: smsResult.error ?? null,
          sent_at: smsResult.success ? new Date().toISOString() : null,
        };

        const smsLogResult = await ctx.supabaseAdmin.from("sms_logs").insert(smsLogInsert);
        if (smsLogResult.error) {
          const message = `Failed to persist SMS log: ${smsLogResult.error.message}`;
          console.error(message);
          smsError = smsError ? `${smsError} | ${message}` : message;
        }

        smsSent = smsResult.success;
      } else if (input.notifyBySms && !household.phone_number) {
        smsError = "Household has no registered phone number.";
      }

      if (input.notifyInApp && household.registered_by) {
        const appPingInsert: TableInsert<"status_pings"> = {
          barangay_id: barangayId,
          resident_id: household.registered_by,
          household_id: household.id,
          status: mapEvacuationStatusToPingStatus(input.evacuationStatus as EvacuationStatus),
          channel: "app",
          message: statusMessage,
          is_resolved: true,
          resolved_by: ctx.session.id,
          resolved_at: now,
        };

        const appInsertResult = await ctx.supabaseAdmin.from("status_pings").insert(appPingInsert);
        if (appInsertResult.error) {
          appError = `Failed to create app notification ping: ${appInsertResult.error.message}`;
          console.error(appError);
        } else {
          appNotified = true;
        }
      } else if (input.notifyInApp && !household.registered_by) {
        appError = "Household has no linked resident profile for app notification.";
      }

      return {
        ...household,
        _statusComms: {
          smsSent,
          smsAttempted,
          smsError,
          appNotified,
          appError,
          template: templateKey,
          note: input.note ?? null,
        },
      };
    }),
});
