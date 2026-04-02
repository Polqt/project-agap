import type { Broadcast, Profile, TableInsert } from "@project-agap/api/supabase";

import { supabase } from "@/services/supabase";
import { trpcClient } from "@/services/trpc";
import type { BroadcastCreateQueuePayload, QueuedAction } from "@/types/offline";

const broadcastColumns =
  "id, barangay_id, sent_by, broadcast_type, message, message_filipino, target_purok, push_sent_count, sms_sent_count, sent_at";

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
const broadcastAuthorColumns = "id, barangay_id";

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
  author: BroadcastAuthor,
) {
  if (!author.barangay_id) {
    throw new Error("Your profile is not assigned to a barangay.");
  }

  const insertPayload: TableInsert<"broadcasts"> = {
    id: payload.broadcastId,
    barangay_id: author.barangay_id,
    sent_by: author.id,
    broadcast_type: payload.broadcastType,
    message: payload.message,
    message_filipino: payload.messageFilipino ?? null,
    target_purok: payload.targetPurok ?? null,
  };

  const { data, error } = await supabase
    .from("broadcasts")
    .insert(insertPayload)
    .select(broadcastColumns)
    .maybeSingle();

  if (!error) {
    if (!data) {
      throw new Error("Broadcast could not be published.");
    }

    return data;
  }

  if (error.code !== "23505") {
    throw new Error(error.message);
  }

  const { data: existing, error: existingError } = await supabase
    .from("broadcasts")
    .select(broadcastColumns)
    .eq("id", payload.broadcastId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error("Broadcast could not be loaded after publish.");
  }

  return existing;
}

export async function listBroadcastsForBarangay(barangayId: string) {
  const { data, error } = await supabase
    .from("broadcasts")
    .select(broadcastColumns)
    .eq("barangay_id", barangayId)
    .order("sent_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function getCurrentBroadcastAuthor(): Promise<BroadcastAuthor> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user.id) {
    throw new Error("Sign in again before queued broadcasts can sync.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(broadcastAuthorColumns)
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.barangay_id) {
    throw new Error("Your official profile is not assigned to a barangay.");
  }

  return data;
}

export async function replayQueuedBroadcast(payload: BroadcastCreateQueuePayload) {
  const preparedPayload = prepareBroadcastPayload(payload);
  const author = await getCurrentBroadcastAuthor();

  await publishBroadcastRecord(preparedPayload, author);
  return trpcClient.broadcasts.create.mutate(preparedPayload);
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
