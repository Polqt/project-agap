import type { AlertSeverity, PingStatus } from "@project-agap/api/supabase";
import { Ionicons } from "@expo/vector-icons";

export function getErrorMessage(error: unknown, fallback = "Subukan muli.") {
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

export function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistanceKm(distanceKm?: number | null) {
  if (distanceKm === undefined || distanceKm === null || Number.isNaN(distanceKm)) {
    return "Hindi matukoy";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

export function getStatusLabel(status: PingStatus) {
  return status === "safe" ? "Ligtas" : "Kailangan ng Tulong";
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
