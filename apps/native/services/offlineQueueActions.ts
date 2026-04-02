import { trpcClient } from "@/services/trpc";
import type {
  BroadcastCreateQueuePayload,
  CheckInManualQueuePayload,
  CheckInProxyQueuePayload,
  CheckInQrQueuePayload,
  NeedsReportSubmitQueuePayload,
  QueuedAction,
  StatusPingQueuePayload,
  WelfareRecordOutcomeQueuePayload,
} from "@/types/offline";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_QUEUE_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

export function createQueuedAction<TType extends QueuedAction["type"]>(
  type: TType,
  payload: QueuedAction<TType>["payload"],
): QueuedAction<TType> {
  return {
    id: `${type}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
    failedAt: null,
    lastError: null,
  };
}

export function isExpiredQueuedAction(action: QueuedAction) {
  return Date.now() - action.createdAt > ONE_DAY_MS;
}

export async function replayQueuedAction(action: QueuedAction) {
  switch (action.type) {
    case "status-ping.submit":
      await trpcClient.statusPings.submit.mutate(action.payload as StatusPingQueuePayload);
      return;
    case "check-in.qr":
      await trpcClient.checkIns.byQr.mutate(action.payload as CheckInQrQueuePayload);
      return;
    case "check-in.manual":
      await trpcClient.checkIns.manual.mutate(action.payload as CheckInManualQueuePayload);
      return;
    case "check-in.proxy":
      await trpcClient.checkIns.proxy.mutate(action.payload as CheckInProxyQueuePayload);
      return;
    case "welfare.recordOutcome":
      await trpcClient.households.recordWelfareOutcome.mutate(
        action.payload as WelfareRecordOutcomeQueuePayload,
      );
      return;
    case "needs-report.submit":
      await trpcClient.needsReports.submit.mutate(action.payload as NeedsReportSubmitQueuePayload);
      return;
    case "broadcast.create":
      await trpcClient.broadcasts.create.mutate(action.payload as BroadcastCreateQueuePayload);
      return;
    default:
      throw new Error("Unsupported queued action.");
  }
}

export function getRetryDelayMs(retries: number) {
  const safeIndex = Math.max(0, Math.min(retries, RETRY_DELAYS_MS.length - 1));
  return RETRY_DELAYS_MS[safeIndex];
}
