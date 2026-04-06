import { TRPCClientError } from "@trpc/client";

import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";

const NORMAL_RETRY_DELAYS_MS = [800, 1800] as const;
const WEAK_RETRY_DELAYS_MS = [1200, 3000, 6500] as const;
const NORMAL_TIMEOUT_MS = 9_000;
const WEAK_TIMEOUT_MS = 18_000;

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isTimeoutLikeError(error: unknown) {
  const message = getErrorMessage(error, "").toLowerCase();
  return message.includes("timed out") || message.includes("timeout");
}

function createTimeoutError(actionLabel: string) {
  return new TRPCClientError(`${actionLabel} timed out on a weak connection.`);
}

async function withTimeout<TValue>(
  promise: Promise<TValue>,
  timeoutMs: number,
  actionLabel: string,
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<TValue>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(createTimeoutError(actionLabel)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function runWithNetworkResilience<TValue>(
  actionLabel: string,
  task: () => Promise<TValue>,
  options?: {
    isWeakConnection?: boolean;
  },
) {
  const isWeakConnection = options?.isWeakConnection ?? false;
  const retryDelays = isWeakConnection ? WEAK_RETRY_DELAYS_MS : NORMAL_RETRY_DELAYS_MS;
  const timeoutMs = isWeakConnection ? WEAK_TIMEOUT_MS : NORMAL_TIMEOUT_MS;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retryDelays.length) {
    try {
      return await withTimeout(task(), timeoutMs, actionLabel);
    } catch (error) {
      lastError = error;
      const shouldRetry = isOfflineLikeError(error) || isTimeoutLikeError(error);

      if (!shouldRetry || attempt >= retryDelays.length) {
        throw error;
      }

      await sleep(retryDelays[attempt]!);
      attempt += 1;
    }
  }

  throw lastError;
}
