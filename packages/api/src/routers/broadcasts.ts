import { z } from "zod";

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, router } from "../index";
import type { Broadcast, TableInsert } from "../supabase";
import { sendSms } from "../textbee";

const uuidSchema = z.string().uuid();

const broadcastColumns =
  "id, barangay_id, sent_by, broadcast_type, message, message_filipino, target_purok, push_sent_count, sms_sent_count, sent_at";

export const broadcastsRouter = router({
  create: officialProcedure
    .input(
      z.object({
        broadcastType: z.enum(["evacuate_now", "stay_alert", "all_clear", "custom"]).default("custom"),
        message: z.string().trim().min(1).max(2000),
        messageFilipino: z.string().trim().max(2000).nullish(),
        targetPurok: z.string().trim().max(120).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      const insertPayload: TableInsert<"broadcasts"> = {
        barangay_id: barangayId,
        sent_by: ctx.session.id,
        broadcast_type: input.broadcastType,
        message: input.message,
        message_filipino: input.messageFilipino ?? null,
        target_purok: input.targetPurok ?? null,
      };

      const broadcast = getFoundOrThrow<Broadcast | null>(
        getSupabaseDataOrThrow<Broadcast | null>(
          await ctx.supabase
            .from("broadcasts")
            .insert(insertPayload)
            .select(broadcastColumns)
            .maybeSingle(),
          "Failed to create broadcast.",
        ),
        "Broadcast creation failed.",
      );

      let householdQuery = ctx.supabaseAdmin
        .from("households")
        .select("id, phone_number, household_head")
        .eq("barangay_id", barangayId)
        .not("phone_number", "is", null);

      if (input.targetPurok) {
        householdQuery = householdQuery.eq("purok", input.targetPurok);
      }

      const { data: households } = await householdQuery;
      const recipients = (households ?? []).filter(
        (h): h is typeof h & { phone_number: string } => !!h.phone_number,
      );

      const smsMessage = input.messageFilipino
        ? `${input.messageFilipino}\n\n${input.message}`
        : input.message;

      let smsSentCount = 0;

      const smsResults = await Promise.allSettled(
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
