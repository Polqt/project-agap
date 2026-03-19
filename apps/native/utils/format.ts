import type {
  AlertSeverity,
  EvacuationStatus,
  PingStatus,
  VulnerabilityFlag,
} from "@project-agap/api/supabase";
import { Ionicons } from "@expo/vector-icons";

import { STATUS_LABELS, T, VULNERABILITY_LABELS } from "@/utils/i18n";

export function getErrorMessage(error: unknown, fallback: string = T.tryAgain) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "Wala pa";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} minuto ang nakalipas`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} oras ang nakalipas`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} araw ang nakalipas`;
}

export function formatDistance(meters?: number | null) {
  if (meters === undefined || meters === null || Number.isNaN(meters)) {
    return "Hindi matukoy";
  }

  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatEvacuationStatus(status?: EvacuationStatus | "welfare_check_dispatched" | null) {
  if (!status) {
    return T.unknown;
  }

  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
}

export function formatPingStatus(status: PingStatus) {
  return status === "safe" ? T.safe : T.need_help;
}

export function formatVulnerabilityFlags(flags: VulnerabilityFlag[]) {
  return flags.map((flag) => VULNERABILITY_LABELS[flag] ?? flag);
}

export function getSeverityMeta(severity: AlertSeverity) {
  switch (severity) {
    case "danger":
      return { label: "Danger", className: "bg-rose-100 text-rose-700" };
    case "warning":
      return { label: "Warning", className: "bg-orange-100 text-orange-700" };
    case "watch":
      return { label: "Watch", className: "bg-amber-100 text-amber-700" };
    case "advisory":
      return { label: "Advisory", className: "bg-yellow-100 text-yellow-700" };
    default:
      return { label: "Info", className: "bg-sky-100 text-sky-700" };
  }
}

export function getHazardIconName(hazardType: string): keyof typeof Ionicons.glyphMap {
  const normalized = hazardType.toLowerCase();

  if (normalized.includes("flood")) {
    return "rainy-outline";
  }

  if (normalized.includes("earth")) {
    return "pulse-outline";
  }

  if (normalized.includes("volcano")) {
    return "flame-outline";
  }

  return "thunderstorm-outline";
}
