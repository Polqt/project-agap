import { isConflictLikeError } from "@/shared/utils/errors";
import type { QueuedAction } from "@/types/offline";

const ACTION_LABELS: Record<QueuedAction["type"], string> = {
  "status-ping.submit": "Resident status ping",
  "household.register": "Household registration",
  "check-in.qr": "QR check-in",
  "check-in.manual": "Manual check-in",
  "check-in.proxy": "Proxy check-in",
  "welfare.recordOutcome": "Welfare outcome",
  "needs-report.submit": "Needs report",
  "broadcast.create": "Broadcast",
  "household.update-status": "Registry status update",
  "household.assign-welfare": "Welfare assignment",
  "center.toggle-open": "Center open or close",
  "center.rotate-qr": "Center QR rotation",
  "center.update-supplies": "Center supplies update",
  "missing-person.report": "Missing-person report",
  "missing-person.mark-found": "Missing-person found update",
  "profile.update": "Profile update",
  "profile.set-pinned-location": "Pinned location update",
  "profile.clear-pinned-location": "Pinned location clear",
  "barangay.set-resident-access": "Resident access settings",
};

export function getOfflineConflictActions(actions: QueuedAction[]) {
  return actions.filter(
    (action) => action.failedAt !== null && action.lastError && isConflictLikeError(action.lastError),
  );
}

export function getQueuedActionLabel(type: QueuedAction["type"]) {
  return ACTION_LABELS[type] ?? type;
}

export function formatConflictAge(timestamp: number | null) {
  if (!timestamp) {
    return "Blocked recently";
  }

  const deltaMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));

  if (deltaMinutes < 60) {
    return `Blocked ${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `Blocked ${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `Blocked ${deltaDays}d ago`;
}
