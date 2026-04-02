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
  const message = getErrorMessage(error, "").toLowerCase();

  return (
    message.includes("network request failed") ||
    message.includes("network error") ||
    message.includes("fetch failed") ||
    message.includes("offline")
  );
}

export function getServerConnectionErrorMessage(
  fallback = "Unable to reach the server.",
) {
  return `${fallback} Check that web server is running and EXPO_PUBLIC_SERVER_URL is set to your laptop LAN IP (current: ${env.EXPO_PUBLIC_SERVER_URL}).`;
}
