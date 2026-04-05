import { z } from "zod";

import { ApiError } from "../errors";
import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, router } from "../index";
import { barangayIdSchema } from "../schemas";
import type { Broadcast, TableInsert } from "../supabase";
import { sendSms } from "../textbee";

const broadcastColumns =
  "id, barangay_id, sent_by, broadcast_type, message, message_filipino, target_purok, push_sent_count, sms_sent_count, sent_at";

export const broadcastsRouter = router({
  audienceOverview: officialProcedure.query(async ({ ctx }) => {
    const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

    const households =
      getSupabaseDataOrThrow<
        Array<{
          purok: string;
          phone_number: string | null;
          is_sms_only: boolean;
        }>
      >(
        await ctx.supabase
          .from("households")
          .select("purok, phone_number, is_sms_only")
          .eq("barangay_id", barangayId),
        "Failed to load broadcast audience.",
      ) ?? [];

    const purokMap = new Map<
      string,
      {
        purok: string;
        householdCount: number;
        smsReachableCount: number;
        appReachableCount: number;
      }
    >();

    for (const household of households) {
      const current =
        purokMap.get(household.purok) ?? {
          purok: household.purok,
          householdCount: 0,
          smsReachableCount: 0,
          appReachableCount: 0,
        };

      current.householdCount += 1;
      if (household.phone_number) {
        current.smsReachableCount += 1;
      }
      if (!household.is_sms_only) {
        current.appReachableCount += 1;
      }

      purokMap.set(household.purok, current);
    }

    const puroks = Array.from(purokMap.values()).sort((left, right) =>
      left.purok.localeCompare(right.purok, "en", { sensitivity: "base" }),
    );

    return {
      householdCount: households.length,
      smsReachableCount: households.filter((household) => household.phone_number).length,
      appReachableCount: households.filter((household) => !household.is_sms_only).length,
      puroks,
    };
  }),

  create: officialProcedure
    .input(
      z.object({
        broadcastId: z.string().uuid().optional(),
        sentAt: z.string().datetime({ offset: true }).optional(),
        broadcastType: z.enum(["evacuate_now", "stay_alert", "all_clear", "custom"]).default("custom"),
        message: z.string().trim().min(1).max(2000),
        messageFilipino: z.string().trim().max(2000).nullish(),
        targetPurok: z.string().trim().max(120).nullish(),
        targetHouseholdId: z.string().uuid().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const existingBroadcast =
        input.broadcastId
          ? getSupabaseDataOrThrow<Broadcast | null>(
              await ctx.supabaseAdmin
                .from("broadcasts")
                .select(broadcastColumns)
                .eq("id", input.broadcastId)
                .maybeSingle(),
              "Failed to load existing broadcast.",
            )
          : null;

      if (
        existingBroadcast &&
        (existingBroadcast.barangay_id !== barangayId || existingBroadcast.sent_by !== ctx.session.id)
      ) {
        throw ApiError.forbidden("This broadcast cannot be finalized by the current session.");
      }

      if (
        existingBroadcast &&
        (existingBroadcast.broadcast_type !== input.broadcastType ||
          existingBroadcast.message !== input.message ||
          existingBroadcast.message_filipino !== (input.messageFilipino ?? null) ||
          existingBroadcast.target_purok !== (input.targetPurok ?? null))
      ) {
        throw ApiError.badRequest("This queued broadcast no longer matches the stored record.");
      }

      const broadcast =
        existingBroadcast ??
        getFoundOrThrow<Broadcast | null>(
          getSupabaseDataOrThrow<Broadcast | null>(
            await ctx.supabase
              .from("broadcasts")
              .insert({
                ...(input.broadcastId ? { id: input.broadcastId } : {}),
                barangay_id: barangayId,
                sent_by: ctx.session.id,
                broadcast_type: input.broadcastType,
                message: input.message,
                message_filipino: input.messageFilipino ?? null,
                target_purok: input.targetPurok ?? null,
              } satisfies TableInsert<"broadcasts">)
              .select(broadcastColumns)
              .maybeSingle(),
            "Failed to create broadcast.",
          ),
          "Broadcast creation failed.",
        );

      const existingLogs =
        getSupabaseDataOrThrow<Array<Pick<TableInsert<"sms_logs">, "delivery_status">>>(
          await ctx.supabaseAdmin
            .from("sms_logs")
            .select("delivery_status")
            .eq("broadcast_id", broadcast.id),
          "Failed to load existing SMS logs.",
        ) ?? [];

      if (existingLogs.length > 0) {
        const sentCount = existingLogs.filter((log) => log.delivery_status !== "failed").length;

        return {
          ...broadcast,
          _smsResults: {
            total: existingLogs.length,
            sent: sentCount,
            failed: existingLogs.length - sentCount,
          },
        };
      }

      let householdQuery = ctx.supabaseAdmin
        .from("households")
        .select("id, phone_number, household_head")
        .eq("barangay_id", barangayId)
        .not("phone_number", "is", null);

      if (input.targetPurok) {
        householdQuery = householdQuery.eq("purok", input.targetPurok);
      }

      if (input.targetHouseholdId) {
        householdQuery = householdQuery.eq("id", input.targetHouseholdId);
      }

      const { data: households } = await householdQuery;
      const recipients = (households ?? []).filter(
        (h): h is typeof h & { phone_number: string } => !!h.phone_number,
      );

      if (input.targetHouseholdId && recipients.length === 0) {
        throw ApiError.badRequest(
          "Selected recipient cannot receive SMS broadcast (missing phone or not in your barangay).",
        );
      }

      const smsMessage = input.messageFilipino
        ? `${input.message}\n\n${input.messageFilipino}`
        : input.message;

      let smsSentCount = 0;

      await Promise.allSettled(
        recipients.map(async (household) => {
          const result = await sendSms(household.phone_number, smsMessage);

          const smsLogInsert: TableInsert<"sms_logs"> = {
            barangay_id: barangayId,
            household_id: household.id,
            broadcast_id: broadcast.id,
            direction: "outbound",
            phone_number: household.phone_number,
            message: smsMessage,
            delivery_status: result.success ? "sent" : "failed",
            gateway_message_id: result.messageId ?? null,
            error_message: result.error ?? null,
            sent_at: result.success ? new Date().toISOString() : null,
          };

          await ctx.supabaseAdmin.from("sms_logs").insert(smsLogInsert);

          if (result.success) smsSentCount++;
          return result;
        }),
      );

      if (smsSentCount > 0) {
        await ctx.supabaseAdmin
          .from("broadcasts")
          .update({ sms_sent_count: smsSentCount })
          .eq("id", broadcast.id);
      }

      return {
        ...broadcast,
        sms_sent_count: smsSentCount,
        _smsResults: {
          total: recipients.length,
          sent: smsSentCount,
          failed: recipients.length - smsSentCount,
        },
      };
    }),

  list: officialProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<Broadcast[]>(
        await ctx.supabase
          .from("broadcasts")
          .select(
            "id, barangay_id, sent_by, broadcast_type, message, message_filipino, target_purok, push_sent_count, sms_sent_count, sent_at",
          )
          .eq("barangay_id", barangayId)
          .order("sent_at", { ascending: false }),
        "Failed to list broadcasts.",
      ) ?? [];
    }),
});
