import type { Alert, Broadcast, Profile, SmsLog } from "@project-agap/api/supabase";

import { trpcClient } from "@/services/trpc";
import type { BroadcastCreateQueuePayload, QueuedAction } from "@/types/offline";

export type PreparedBroadcastPayload = BroadcastCreateQueuePayload & {
  broadcastId: string;
  sentAt: string;
};

export type BroadcastTimelineItem = Broadcast & {
  isLocalOnly: boolean;
  lastError: string | null;
  syncState: "sent" | "publishing" | "queued" | "failed";
};

type BroadcastAuthor = Pick<Profile, "id" | "barangay_id">;

export type BroadcastAudienceOverview = {
  householdCount: number;
  smsReachableCount: number;
  appReachableCount: number;
  puroks: Array<{
    purok: string;
    householdCount: number;
    smsReachableCount: number;
    appReachableCount: number;
  }>;
};

function createUuid() {
  const randomUuid = globalThis.crypto?.randomUUID;

  if (typeof randomUuid === "function") {
    return randomUuid.call(globalThis.crypto);
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function toBroadcastFromAction(action: QueuedAction<"broadcast.create">): BroadcastTimelineItem {
  const payload = action.payload;
  const broadcastId = payload.broadcastId ?? action.id;
  const sentAt = payload.sentAt ?? new Date(action.createdAt).toISOString();

  return {
    id: broadcastId,
    barangay_id: "",
    sent_by: "",
    broadcast_type: payload.broadcastType,
    message: payload.message,
    message_filipino: payload.messageFilipino ?? null,
    target_purok: payload.targetPurok ?? null,
    push_sent_count: 0,
    sms_sent_count: 0,
    sent_at: sentAt,
    isLocalOnly: true,
    lastError: action.lastError,
    syncState: action.failedAt ? "failed" : "queued",
  };
}

export function prepareBroadcastPayload(payload: BroadcastCreateQueuePayload): PreparedBroadcastPayload {
  return {
    ...payload,
    broadcastId: payload.broadcastId ?? createUuid(),
    sentAt: payload.sentAt ?? new Date().toISOString(),
  };
}

export async function publishBroadcastRecord(
  payload: PreparedBroadcastPayload,
  _author: BroadcastAuthor,
) {
  return trpcClient.broadcasts.create.mutate(payload);
}

export async function listBroadcastsForBarangay(barangayId: string) {
  return trpcClient.broadcasts.list.query({ barangayId });
}

export async function listActiveAgencyAlerts(barangayId: string) {
  return (await trpcClient.alerts.listActive.query({ barangayId })) as Alert[];
}

export async function listOutboundSmsLogsForBarangay(barangayId: string) {
  return (await trpcClient.smsLogs.list.query({ barangayId, direction: "outbound" })) as SmsLog[];
}

export async function getBroadcastAudienceOverview(barangayId: string): Promise<BroadcastAudienceOverview> {
  void barangayId;
  return trpcClient.broadcasts.audienceOverview.query();
}

async function getCurrentBroadcastAuthor(): Promise<BroadcastAuthor> {
  const data = await trpcClient.profile.getMe.query();
  if (!data?.barangay_id) {
    throw new Error("Your official profile is not assigned to a barangay.");
  }
  return { id: data.id, barangay_id: data.barangay_id };
}

export async function replayQueuedBroadcast(payload: BroadcastCreateQueuePayload) {
  const preparedPayload = prepareBroadcastPayload(payload);
  const author = await getCurrentBroadcastAuthor();
  return publishBroadcastRecord(preparedPayload, author);
}

export function mergeBroadcastHistory(
  remoteBroadcasts: Broadcast[],
  queuedActions: QueuedAction[],
) {
  const broadcastActions = queuedActions.filter(
    (action): action is QueuedAction<"broadcast.create"> => action.type === "broadcast.create",
  );
  const queuedByBroadcastId = new Map<string, QueuedAction<"broadcast.create">>();

  for (const action of broadcastActions) {
    queuedByBroadcastId.set(action.payload.broadcastId ?? action.id, action);
  }

  const remoteItems: BroadcastTimelineItem[] = remoteBroadcasts.map((broadcast) => {
    const queuedAction = queuedByBroadcastId.get(broadcast.id);

    return {
      ...broadcast,
      isLocalOnly: false,
      lastError: queuedAction?.lastError ?? null,
      syncState: queuedAction ? (queuedAction.failedAt ? "failed" : "publishing") : "sent",
    };
  });

  const localOnlyItems = broadcastActions
    .filter((action) => !remoteBroadcasts.some((broadcast) => broadcast.id === (action.payload.broadcastId ?? action.id)))
    .map(toBroadcastFromAction);

  return [...remoteItems, ...localOnlyItems].sort(
    (left, right) => new Date(right.sent_at).getTime() - new Date(left.sent_at).getTime(),
  );
}
