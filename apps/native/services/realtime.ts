export const REALTIME_TABLES = [
  "alerts",
  "broadcasts",
  "check_ins",
  "evacuation_centers",
  "households",
  "needs_reports",
  "status_pings",
] as const;

type RealtimeRecord = {
  id?: string | null;
  barangay_id?: string | null;
  resident_id?: string | null;
  status?: string | null;
  channel?: string | null;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  broadcast_type?: string | null;
  is_active?: boolean | null;
};

type RealtimePayloadLike = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: RealtimeRecord;
  old: RealtimeRecord;
};

export function matchesRealtimeBarangayScope(
  table: (typeof REALTIME_TABLES)[number],
  barangayId: string,
  payload: RealtimePayloadLike,
) {
  const nextBarangayId = payload.new.barangay_id ?? payload.old.barangay_id ?? null;

  if (table === "alerts") {
    return nextBarangayId === null || nextBarangayId === barangayId;
  }

  return nextBarangayId === barangayId;
}

export function shouldNotifyResidentAlert(payload: RealtimePayloadLike) {
  return payload.eventType !== "DELETE" && payload.new.is_active !== false;
}

export function getRealtimeAlertNotification(payload: RealtimePayloadLike) {
  return {
    title: payload.new.title || "New barangay alert",
    body: payload.new.body || "Open Agap to view the latest advisory details.",
  };
}

export function shouldNotifyResidentBroadcast(payload: RealtimePayloadLike) {
  return payload.eventType === "INSERT";
}

export function getRealtimeBroadcastNotification(payload: RealtimePayloadLike) {
  const typeLabel = payload.new.broadcast_type
    ? payload.new.broadcast_type.replaceAll("_", " ").toUpperCase()
    : "Barangay update";

  return {
    title: typeLabel,
    body: payload.new.message || "Open Agap to read the latest barangay broadcast.",
  };
}

export function shouldNotifyResidentStatusPing(payload: RealtimePayloadLike, residentId: string) {
  if (payload.eventType !== "INSERT") {
    return false;
  }

  return payload.new.channel === "app" && payload.new.resident_id === residentId;
}

export function getRealtimeStatusPingNotification(payload: RealtimePayloadLike) {
  const statusLabel = payload.new.status === "safe" ? "Safe" : "Need Help";

  return {
    title: `Status Update: ${statusLabel}`,
    body: payload.new.message || "Your household status was updated by your barangay response team.",
  };
}
