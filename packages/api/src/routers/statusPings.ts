import { z } from "zod";

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getProfileOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, protectedProcedure, router } from "../index";
import { ApiError } from "../errors";
import { barangayIdSchema, locationSchema, uuidSchema } from "../schemas";
import type { StatusPing, TableInsert } from "../supabase";

const STATUS_PING_COOLDOWN_MS = 30_000;

export const statusPingsRouter = router({
  getLatestMine: protectedProcedure.query(async ({ ctx }) => {
    const ping = getSupabaseDataOrThrow<StatusPing | null>(
      await ctx.supabase
        .from("status_pings")
        .select(
          "id, barangay_id, resident_id, household_id, status, channel, latitude, longitude, message, is_resolved, resolved_by, resolved_at, pinged_at",
        )
        .eq("resident_id", ctx.session.id)
        .order("pinged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "Failed to load latest status ping.",
    );

    return ping;
  }),

  submit: protectedProcedure
    .input(
      z
        .object({
          householdId: uuidSchema.nullish(),
          status: z.enum(["safe", "need_help"]),
          message: z.string().trim().max(500).nullish(),
        })
        .merge(locationSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getProfileBarangayIdOrThrow(profile);
      const latestExistingPing = getSupabaseDataOrThrow<Pick<StatusPing, "pinged_at"> | null>(
        await ctx.supabase
          .from("status_pings")
          .select("pinged_at")
          .eq("resident_id", ctx.session.id)
          .order("pinged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        "Failed to check recent status ping.",
      );

      if (latestExistingPing) {
        const elapsedMs = Date.now() - Date.parse(latestExistingPing.pinged_at);

        if (elapsedMs < STATUS_PING_COOLDOWN_MS) {
          const waitSeconds = Math.max(
            1,
            Math.ceil((STATUS_PING_COOLDOWN_MS - elapsedMs) / 1000),
          );
          throw ApiError.badRequest(
            `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before sending another status ping.`,
          );
        }
      }

      if (input.householdId) {
        getFoundOrThrow<{ id: string } | null>(
          getSupabaseDataOrThrow<{ id: string } | null>(
            await ctx.supabase
              .from("households")
              .select("id")
              .eq("id", input.householdId)
              .eq("barangay_id", barangayId)
              .maybeSingle(),
            "Failed to validate household for status ping.",
          ),
          "Household not found.",
        );
      }

      const insertPayload: TableInsert<"status_pings"> = {
        barangay_id: barangayId,
        resident_id: ctx.session.id,
        household_id: input.householdId ?? null,
        status: input.status,
        channel: "app",
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        message: input.message ?? null,
      };

      const ping = getFoundOrThrow<StatusPing | null>(
        getSupabaseDataOrThrow<StatusPing | null>(
          await ctx.supabase
            .from("status_pings")
            .insert(insertPayload)
            .select(
              "id, barangay_id, resident_id, household_id, status, channel, latitude, longitude, message, is_resolved, resolved_by, resolved_at, pinged_at",
            )
            .maybeSingle(),
          "Failed to submit status ping.",
        ),
        "Status ping submission failed.",
      );

      return ping;
    }),

  resolve: officialProcedure
    .input(
      z.object({
        pingId: uuidSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(ctx.profile);
      const ping = getFoundOrThrow<{ id: string } | null>(
        getSupabaseDataOrThrow<{ id: string } | null>(
          await ctx.supabase
            .from("status_pings")
            .select("id")
            .eq("id", input.pingId)
            .eq("barangay_id", barangayId)
            .maybeSingle(),
          "Failed to load status ping.",
        ),
        "Status ping not found.",
      );

      getSupabaseDataOrThrow<null>(
        await ctx.supabase.rpc("resolve_need_help_ping", {
          p_ping_id: ping.id,
        }),
        "Failed to resolve status ping.",
      );

      return {
        success: true,
        pingId: ping.id,
      };
    }),

  listUnresolved: officialProcedure
    .input(barangayIdSchema)
    .query(async ({ ctx, input }) => {
      const barangayId = getAuthorizedBarangayId(ctx.profile, input.barangayId);

      return getSupabaseDataOrThrow<StatusPing[]>(
        await ctx.supabase
          .from("status_pings")
          .select(
            "id, barangay_id, resident_id, household_id, status, channel, latitude, longitude, message, is_resolved, resolved_by, resolved_at, pinged_at",
          )
          .eq("barangay_id", barangayId)
          .eq("is_resolved", false)
          .order("pinged_at", { ascending: false }),
        "Failed to list unresolved status pings.",
      ) ?? [];
    }),
});
