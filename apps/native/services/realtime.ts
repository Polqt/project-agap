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
  barangay_id?: string | null;
  title?: string | null;
  body?: string | null;
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
