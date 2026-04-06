import { z } from "zod";

import {
  getFoundOrThrow,
  getProfileOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { protectedProcedure, router } from "../index";
import { uuidSchema } from "../schemas";
import type { MissingPerson, TableInsert } from "../supabase";
import { sendExpoPush, type ExpoPushMessage } from "../expo-push";

const columns =
  "id, barangay_id, reported_by, full_name, age, last_seen_location, description, status, found_at, found_by, created_at, updated_at";

export const missingPersonsRouter = router({
  report: protectedProcedure
    .input(
      z.object({
        clientMutationId: z.string().optional(),
        fullName: z.string().trim().min(1).max(160),
        age: z.number().int().min(0).max(130).optional(),
        lastSeenLocation: z.string().trim().max(300).optional(),
        description: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(getProfileOrThrow(ctx.profile));

      if (input.clientMutationId) {
        const existingMutation = getSupabaseDataOrThrow<{ result_payload: string } | null>(
          await ctx.supabase
            .from("mutation_history")
            .select("result_payload")
            .eq("client_mutation_id", input.clientMutationId)
            .maybeSingle(),
          "Failed to check mutation history.",
        );

        if (existingMutation?.result_payload) {
          return JSON.parse(existingMutation.result_payload) as MissingPerson;
        }
      }

      const insertPayload: TableInsert<"missing_persons"> = {
        barangay_id: barangayId,
        reported_by: ctx.session.id,
        full_name: input.fullName,
        age: input.age ?? null,
        last_seen_location: input.lastSeenLocation ?? null,
        description: input.description ?? null,
      };

      const result = getFoundOrThrow<MissingPerson | null>(
        getSupabaseDataOrThrow<MissingPerson | null>(
          await ctx.supabase
            .from("missing_persons")
            .insert(insertPayload)
            .select(columns)
            .maybeSingle(),
          "Failed to report missing person.",
        ),
        "Missing person report failed.",
      );

      if (input.clientMutationId) {
        void ctx.supabase.from("mutation_history").insert({
          client_mutation_id: input.clientMutationId,
          user_id: ctx.session.id,
          mutation_type: "missing-person-report",
          result_payload: JSON.stringify(result),
        });
      }

      // Send push notifications to all Officials in the barangay
      try {
        const { data: officialProfiles } = await ctx.supabase
          .from("profiles")
          .select("id")
          .eq("barangay_id", barangayId)
          .eq("role", "official");

        const officialIds = (officialProfiles ?? []).map((p) => p.id);
        
        if (officialIds.length > 0) {
          const { data: tokens } = await ctx.supabase
            .from("push_tokens")
            .select("token")
            .in("resident_id", officialIds)
            .eq("is_active", true);

          const pushTokens = (tokens ?? []).map((t) => t.token).filter(Boolean);

          if (pushTokens.length > 0) {
            const pushMessages: ExpoPushMessage[] = pushTokens.map((token) => ({
              to: token,
              title: "MISSING PERSON REPORT",
              body: `${input.fullName}${input.age ? `, ${input.age} years old` : ""} has been reported missing${input.lastSeenLocation ? ` last seen at ${input.lastSeenLocation}` : ""}.`,
              data: { type: "missing-person", missingPersonId: result.id },
              sound: "default",
              channelId: "agap-alerts",
              priority: "high",
            }));

            await sendExpoPush(pushMessages);
          }
        }
      } catch (error) {
        // Log but don't fail the request if notifications fail
        console.error("Failed to send missing person notifications:", error);
      }

      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        statusFilter: z.enum(["missing", "found", "all"]).default("missing"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(getProfileOrThrow(ctx.profile));

      let query = ctx.supabase
        .from("missing_persons")
        .select(columns)
        .eq("barangay_id", barangayId)
        .order("created_at", { ascending: false });

      if (input.statusFilter !== "all") {
        query = query.eq("status", input.statusFilter);
      }

      return getSupabaseDataOrThrow<MissingPerson[]>(
        await query,
        "Failed to list missing persons.",
      ) ?? [];
    }),

  markFound: protectedProcedure
    .input(z.object({ clientMutationId: z.string().optional(), id: uuidSchema }))
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(getProfileOrThrow(ctx.profile));

      if (input.clientMutationId) {
        const existingMutation = getSupabaseDataOrThrow<{ result_payload: string } | null>(
          await ctx.supabase
            .from("mutation_history")
            .select("result_payload")
            .eq("client_mutation_id", input.clientMutationId)
            .maybeSingle(),
          "Failed to check mutation history.",
        );

        if (existingMutation?.result_payload) {
          return JSON.parse(existingMutation.result_payload) as MissingPerson;
        }
      }

      const result = getFoundOrThrow<MissingPerson | null>(
        getSupabaseDataOrThrow<MissingPerson | null>(
          await ctx.supabase
            .from("missing_persons")
            .update({
              status: "found",
              found_at: new Date().toISOString(),
              found_by: ctx.session.id,
            })
            .eq("id", input.id)
            .eq("barangay_id", barangayId)
            .select(columns)
            .maybeSingle(),
          "Failed to mark missing person as found.",
        ),
        "Missing person not found.",
      );

      if (input.clientMutationId) {
        void ctx.supabase.from("mutation_history").insert({
          client_mutation_id: input.clientMutationId,
          user_id: ctx.session.id,
          mutation_type: "missing-person-mark-found",
          result_payload: JSON.stringify(result),
        });
      }

      return result;
    }),
});
