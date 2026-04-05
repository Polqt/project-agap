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

const columns =
  "id, barangay_id, reported_by, full_name, age, last_seen_location, description, status, found_at, found_by, created_at, updated_at";

export const missingPersonsRouter = router({
  report: protectedProcedure
    .input(
      z.object({
        fullName: z.string().trim().min(1).max(160),
        age: z.number().int().min(0).max(130).optional(),
        lastSeenLocation: z.string().trim().max(300).optional(),
        description: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(getProfileOrThrow(ctx.profile));

      const insertPayload: TableInsert<"missing_persons"> = {
        barangay_id: barangayId,
        reported_by: ctx.session.id,
        full_name: input.fullName,
        age: input.age ?? null,
        last_seen_location: input.lastSeenLocation ?? null,
        description: input.description ?? null,
      };

      return getFoundOrThrow<MissingPerson | null>(
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
    .input(z.object({ id: uuidSchema }))
    .mutation(async ({ ctx, input }) => {
      const barangayId = getProfileBarangayIdOrThrow(getProfileOrThrow(ctx.profile));

      return getFoundOrThrow<MissingPerson | null>(
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
    }),
});
