import { z } from "zod";

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, router } from "../index";
import type { SmsLog, TableInsert } from "../supabase";
import { sendSms } from "../textbee";

const uuidSchema = z.string().uuid();

const deliveryStatusEnum = z.enum(["queued", "sent", "delivered", "failed", "replied"]);
const directionEnum = z.enum(["outbound", "inbound"]);

const allColumns =
  "id, barangay_id, household_id, broadcast_id, direction, phone_number, message, delivery_status, keyword_reply, gateway_message_id, error_message, sent_at, delivered_at, replied_at, created_at";

export const smsLogsRouter = router({
  list: officialProcedure
    .input(
      z.object({
        barangayId: uuidSchema.optional(),
        broadcastId: uuidSchema.optional(),
        deliveryStatus: deliveryStatusEnum.optional(),
        direction: directionEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      let query = ctx.supabase
        .from("sms_logs")
        .select(allColumns)
        .eq("barangay_id", barangayId);

      if (input.broadcastId) {
        query = query.eq("broadcast_id", input.broadcastId);
      }
      if (input.deliveryStatus) {
        query = query.eq("delivery_status", input.deliveryStatus);
      }
      if (input.direction) {
        query = query.eq("direction", input.direction);
      }

      return getSupabaseDataOrThrow<SmsLog[]>(
        await query
          .order("created_at", { ascending: false })
          .limit(200),
        "Failed to list SMS logs.",
      ) ?? [];
    }),

  getByHousehold: officialProcedure
    .input(
      z.object({
        householdId: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      return getSupabaseDataOrThrow<SmsLog[]>(
        await ctx.supabase
          .from("sms_logs")
          .select(allColumns)
          .eq("barangay_id", barangayId)
          .eq("household_id", input.householdId)
          .order("created_at", { ascending: true }),
        "Failed to fetch SMS thread.",
      ) ?? [];
    }),

  updateStatus: officialProcedure
    .input(
      z.object({
        smsLogId: uuidSchema,
        deliveryStatus: deliveryStatusEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      const smsLog = getFoundOrThrow<SmsLog | null>(
        getSupabaseDataOrThrow<SmsLog | null>(
          await ctx.supabase
            .from("sms_logs")
            .update({ delivery_status: input.deliveryStatus })
            .eq("id", input.smsLogId)
            .eq("barangay_id", barangayId)
            .select(allColumns)
            .maybeSingle(),
          "Failed to update SMS log status.",
        ),
        "SMS log not found.",
      );

      return smsLog;
    }),

  resend: officialProcedure
    .input(z.object({ smsLogId: uuidSchema }))
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      const original = getFoundOrThrow<SmsLog | null>(
        getSupabaseDataOrThrow<SmsLog | null>(
          await ctx.supabaseAdmin
            .from("sms_logs")
            .select(allColumns)
            .eq("id", input.smsLogId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to fetch original SMS log.",
        ),
        "SMS log not found.",
      );

      const result = await sendSms(original.phone_number, original.message);

      const newLog: TableInsert<"sms_logs"> = {
        barangay_id: barangayId,
        household_id: original.household_id,
        broadcast_id: original.broadcast_id,
        direction: "outbound",
        phone_number: original.phone_number,
        message: original.message,
        delivery_status: result.success ? "sent" : "failed",
        gateway_message_id: result.messageId ?? null,
        error_message: result.error ?? null,
        sent_at: result.success ? new Date().toISOString() : null,
      };

      const resent = getFoundOrThrow<SmsLog | null>(
        getSupabaseDataOrThrow<SmsLog | null>(
          await ctx.supabaseAdmin
            .from("sms_logs")
            .insert(newLog)
            .select(allColumns)
            .maybeSingle(),
          "Failed to create resent SMS log.",
        ),
        "Resend log creation failed.",
      );

      return resent;
    }),

  sendSingle: officialProcedure
    .input(
      z.object({
        phoneNumber: z.string().min(1),
        message: z.string().min(1).max(2000),
        householdId: uuidSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);

      const result = await sendSms(input.phoneNumber, input.message);

      const logInsert: TableInsert<"sms_logs"> = {
        barangay_id: barangayId,
        household_id: input.householdId ?? null,
        direction: "outbound",
        phone_number: input.phoneNumber,
        message: input.message,
        delivery_status: result.success ? "sent" : "failed",
        gateway_message_id: result.messageId ?? null,
        error_message: result.error ?? null,
        sent_at: result.success ? new Date().toISOString() : null,
      };

      const smsLog = getFoundOrThrow<SmsLog | null>(
        getSupabaseDataOrThrow<SmsLog | null>(
          await ctx.supabaseAdmin
            .from("sms_logs")
            .insert(logInsert)
            .select(allColumns)
            .maybeSingle(),
          "Failed to log SMS.",
        ),
        "SMS log creation failed.",
      );

      return { ...smsLog, _sendResult: result };
    }),
});
