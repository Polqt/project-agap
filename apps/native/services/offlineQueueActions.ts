import { replayQueuedBroadcast } from "@/features/broadcast/services/broadcasts";
import { trpcClient } from "@/services/trpc";
import { runWithNetworkResilience } from "@/services/networkResilience";
import { appShellStore } from "@/stores/app-shell-store";
import type {
  BarangaySetResidentAccessQueuePayload,
  BroadcastCreateQueuePayload,
  CenterRotateQrQueuePayload,
  CenterToggleOpenQueuePayload,
  CenterUpdateSuppliesQueuePayload,
  CheckInManualQueuePayload,
  CheckInProxyQueuePayload,
  CheckInQrQueuePayload,
  HouseholdAssignWelfareQueuePayload,
  HouseholdRegisterQueuePayload,
  HouseholdUpdateStatusQueuePayload,
  MissingPersonMarkFoundQueuePayload,
  MissingPersonReportQueuePayload,
  NeedsReportSubmitQueuePayload,
  ProfileClearPinnedLocationQueuePayload,
  ProfileSetPinnedLocationQueuePayload,
  ProfileUpdateQueuePayload,
  QueuedAction,
  StatusPingQueuePayload,
  WelfareRecordOutcomeQueuePayload,
} from "@/types/offline";

export const MAX_QUEUE_RETRIES = 8;
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 30000, 60000] as const;

export function createQueuedAction<TType extends QueuedAction["type"]>(
  type: TType,
  payload: QueuedAction<TType>["payload"],
  meta?: QueuedAction<TType>["meta"],
): QueuedAction<TType> {
  const actionId = `${type}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

  return {
    id: actionId,
    type,
    payload: {
      ...payload,
      clientMutationId:
        "clientMutationId" in payload && typeof payload.clientMutationId === "string"
          ? payload.clientMutationId
          : actionId,
    } as QueuedAction<TType>["payload"],
    meta: meta ?? null,
    createdAt: Date.now(),
    retries: 0,
    failedAt: null,
    lastError: null,
  };
}

export function isExpiredQueuedAction(action: QueuedAction) {
  void action;
  return false;
}

export async function replayQueuedAction(action: QueuedAction) {
  const isWeakConnection = appShellStore.state.syncStatus === "degraded";

  async function run(task: () => Promise<unknown>) {
    return runWithNetworkResilience(`Queue replay: ${action.type}`, task, { isWeakConnection });
  }

  switch (action.type) {
    case "status-ping.submit":
      await run(() => trpcClient.statusPings.submit.mutate(action.payload as StatusPingQueuePayload));
      return;
    case "household.register":
      await run(() => trpcClient.households.register.mutate(action.payload as HouseholdRegisterQueuePayload));
      return;
    case "check-in.qr":
      await run(() => trpcClient.checkIns.byQr.mutate(action.payload as CheckInQrQueuePayload));
      return;
    case "check-in.manual":
      await run(() => trpcClient.checkIns.manual.mutate(action.payload as CheckInManualQueuePayload));
      return;
    case "check-in.proxy":
      await run(() => trpcClient.checkIns.proxy.mutate(action.payload as CheckInProxyQueuePayload));
      return;
    case "welfare.recordOutcome":
      await run(() => trpcClient.households.recordWelfareOutcome.mutate(action.payload as WelfareRecordOutcomeQueuePayload));
      return;
    case "needs-report.submit":
      await run(() => trpcClient.needsReports.submit.mutate(action.payload as NeedsReportSubmitQueuePayload));
      return;
    case "broadcast.create":
      await run(() => replayQueuedBroadcast(action.payload as BroadcastCreateQueuePayload));
      return;
    case "household.update-status":
      await run(() => trpcClient.households.updateStatus.mutate(action.payload as HouseholdUpdateStatusQueuePayload));
      return;
    case "household.assign-welfare":
      await run(() => trpcClient.households.assignWelfareVisit.mutate(action.payload as HouseholdAssignWelfareQueuePayload));
      return;
    case "center.toggle-open":
      await run(() => trpcClient.evacuationCenters.toggleOpen.mutate(action.payload as CenterToggleOpenQueuePayload));
      return;
    case "center.rotate-qr":
      await run(() => trpcClient.evacuationCenters.rotateQrToken.mutate(action.payload as CenterRotateQrQueuePayload));
      return;
    case "center.update-supplies":
      await run(() => trpcClient.evacuationCenters.updateSupplies.mutate(action.payload as CenterUpdateSuppliesQueuePayload));
      return;
    case "missing-person.report":
      await run(() => trpcClient.missingPersons.report.mutate(action.payload as MissingPersonReportQueuePayload));
      return;
    case "missing-person.mark-found":
      await run(() => trpcClient.missingPersons.markFound.mutate(action.payload as MissingPersonMarkFoundQueuePayload));
      return;
    case "profile.update":
      await run(() => trpcClient.profile.update.mutate(action.payload as ProfileUpdateQueuePayload));
      return;
    case "profile.set-pinned-location":
      await run(() => trpcClient.profile.setPinnedLocation.mutate(action.payload as ProfileSetPinnedLocationQueuePayload));
      return;
    case "profile.clear-pinned-location":
      await run(() => trpcClient.profile.clearPinnedLocation.mutate(action.payload as ProfileClearPinnedLocationQueuePayload));
      return;
    case "barangay.set-resident-access":
      await run(() => trpcClient.barangays.setResidentAccess.mutate(action.payload as BarangaySetResidentAccessQueuePayload));
      return;
    default:
      throw new Error("Unsupported queued action.");
  }
}

export function getRetryDelayMs(retries: number) {
  const safeIndex = Math.max(0, Math.min(retries, RETRY_DELAYS_MS.length - 1));
  return RETRY_DELAYS_MS[safeIndex];
}
