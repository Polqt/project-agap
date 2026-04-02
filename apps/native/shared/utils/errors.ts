import { TRPCClientError } from "@trpc/client";
import { env } from "@project-agap/env/native";

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
  if (error instanceof TRPCClientError) {
    // If tRPC returned a code, the request reached the server and should not be queued as offline.
    if (error.data?.code) {
      return false;
    }
  }

  const message = getErrorMessage(error, "");
  const causeMessage =
    error instanceof Error && typeof error.cause === "object" && error.cause
      ? String((error.cause as { message?: unknown }).message ?? "")
      : "";

  return hasNetworkSignature(message) || hasNetworkSignature(causeMessage);
}

function hasNetworkSignature(message: string) {
  const value = message.toLowerCase();

  return (
    value.includes("network request failed") ||
    value.includes("network error") ||
    value.includes("fetch failed") ||
    value.includes("failed to fetch") ||
    value.includes("connection refused") ||
    value.includes("timed out") ||
    value.includes("econnrefused") ||
    value.includes("offline")
  );
}

export function getServerConnectionErrorMessage(
  fallback = "Unable to reach the server.",
) {
  return `${fallback} Check that web server is running and EXPO_PUBLIC_SERVER_URL is set to your laptop LAN IP (current: ${env.EXPO_PUBLIC_SERVER_URL}).`;
}
