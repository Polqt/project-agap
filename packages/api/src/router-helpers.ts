import type { PostgrestError } from "@supabase/supabase-js";

import type { Context } from "./context.js";
import { ApiError } from "./errors.js";
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
    const code = mapSupabaseErrorCode(result.error.code);

    switch (code) {
      case "NOT_FOUND":
        throw ApiError.notFound(message.replace(/\.$/, ""));
      case "BAD_REQUEST":
        throw ApiError.badRequest(message);
      case "FORBIDDEN":
        throw ApiError.forbidden(message);
      default:
        throw ApiError.internal(message, result.error);
    }
  }

  return result.data;
}

export function getFoundOrThrow<T>(value: T, message: string): NonNullable<T> {
  if (value === null) {
    throw ApiError.notFound(message.replace(/\.$/, ""));
  }

  return value as NonNullable<T>;
}

export function getProfileOrThrow(
  profile: Context["profile"],
): NonNullable<Context["profile"]> {
  if (!profile) {
    throw ApiError.forbidden("A profile is required to access this resource.");
  }

  return profile;
}

export function getProfileBarangayIdOrThrow(profile: ContextProfile): string {
  if (!profile.barangay_id) {
    throw ApiError.badRequest("Your profile is not assigned to a barangay.");
  }

  return profile.barangay_id;
}

export function getAuthorizedBarangayId(
  profile: ContextProfile,
  requestedBarangayId?: string,
): string {
  const barangayId = getProfileBarangayIdOrThrow(profile);

  if (requestedBarangayId && requestedBarangayId !== barangayId) {
    throw ApiError.forbidden("You can only access data for your assigned barangay.");
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
