import { TRPCClientError } from "@trpc/client";

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof TRPCClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function isOfflineLikeError(error: unknown) {
  const message = getErrorMessage(error, "").toLowerCase();

  return (
    message.includes("network request failed") ||
    message.includes("network error") ||
    message.includes("fetch failed") ||
    message.includes("offline")
  );
}
