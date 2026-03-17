import { TRPCError } from "@trpc/server";
import type { PostgrestError } from "@supabase/supabase-js";

import type { Context } from "./context.js";
import type { ContextProfile } from "./supabase.js";

type SupabaseResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export function getSupabaseDataOrThrow<T>(
  result: SupabaseResponse<T>,
  message: string,
): T | null {
  if (result.error) {
    throw new TRPCError({
      code: mapSupabaseErrorCode(result.error.code),
      message,
      cause: result.error,
    });
  }

  return result.data;
}

export function getFoundOrThrow<T>(value: T, message: string): NonNullable<T> {
  if (value === null) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message,
    });
  }

  return value as NonNullable<T>;
}

export function getProfileOrThrow(
  profile: Context["profile"],
): NonNullable<Context["profile"]> {
  if (!profile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "A profile is required to access this resource.",
    });
  }

  return profile;
}

export function getProfileBarangayIdOrThrow(profile: ContextProfile): string {
  if (!profile.barangay_id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Your profile is not assigned to a barangay.",
    });
  }

  return profile.barangay_id;
}

export function getAuthorizedBarangayId(
  profile: ContextProfile,
  requestedBarangayId?: string,
): string {
  const barangayId = getProfileBarangayIdOrThrow(profile);

  if (requestedBarangayId && requestedBarangayId !== barangayId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only access data for your assigned barangay.",
    });
  }

  return requestedBarangayId ?? barangayId;
}

export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { from, to };
}

function mapSupabaseErrorCode(code: string | null) {
  switch (code) {
    case "PGRST116":
      return "NOT_FOUND" as const;
    case "23503":
    case "23505":
    case "23514":
    case "22P02":
      return "BAD_REQUEST" as const;
    case "42501":
      return "FORBIDDEN" as const;
    default:
      return "INTERNAL_SERVER_ERROR" as const;
  }
}
