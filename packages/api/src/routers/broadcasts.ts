import { z } from "zod";

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers.js";
import { officialProcedure, router } from "../index.js";
import type { Broadcast, TableInsert } from "../supabase.js";

const uuidSchema = z.string().uuid();

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
      const insertPayload: TableInsert<"broadcasts"> = {
        barangay_id: getProfileBarangayIdOrThrow(ctx.profile),
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
            .select(
              "id, barangay_id, sent_by, broadcast_type, message, message_filipino, target_purok, push_sent_count, sms_sent_count, sent_at",
            )
            .maybeSingle(),
          "Failed to create broadcast.",
        ),
        "Broadcast creation failed.",
      );

      return broadcast;
    }),

  list: officialProcedure
    .input(
      z.object({
        barangayId: uuidSchema.optional(),
      }),
    )
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
