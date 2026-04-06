import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Clock } from "lucide-react-native";

type FreshnessLevel = "fresh" | "stale" | "very_stale" | "offline";

interface LastSyncedBadgeProps {
  lastSyncedAt: number | null;
  /** Max age in minutes before showing warning (default: 30) */
  freshnessThresholdMinutes?: number;
  /** Max age in minutes before showing critical warning (default: 120) */
  staleTresholdMinutes?: number;
  className?: string;
}

function getFreshnessLevel(
  lastSyncedAt: number | null,
  freshThreshold: number,
  staleThreshold: number,
): FreshnessLevel {
  if (!lastSyncedAt) return "offline";

  const ageMinutes = (Date.now() - lastSyncedAt) / 1000 / 60;

  if (ageMinutes <= freshThreshold) return "fresh";
  if (ageMinutes <= staleThreshold) return "stale";
  return "very_stale";
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LastSyncedBadge({
  lastSyncedAt,
  freshnessThresholdMinutes = 30,
  staleTresholdMinutes = 120,
  className,
}: LastSyncedBadgeProps) {
  const [now, setNow] = useState(Date.now());

  // Update every 30 seconds to keep "time ago" fresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const freshness = getFreshnessLevel(
    lastSyncedAt,
    freshnessThresholdMinutes,
    staleTresholdMinutes,
  );

  const bgColor =
    freshness === "fresh"
      ? "bg-green-100 dark:bg-green-900/30"
      : freshness === "stale"
        ? "bg-yellow-100 dark:bg-yellow-900/30"
        : freshness === "very_stale"
          ? "bg-orange-100 dark:bg-orange-900/30"
          : "bg-gray-100 dark:bg-gray-800";

  const textColor =
    freshness === "fresh"
      ? "text-green-700 dark:text-green-300"
      : freshness === "stale"
        ? "text-yellow-700 dark:text-yellow-300"
        : freshness === "very_stale"
          ? "text-orange-700 dark:text-orange-300"
          : "text-gray-600 dark:text-gray-400";

  const iconColor =
    freshness === "fresh"
      ? "#15803d"
      : freshness === "stale"
        ? "#a16207"
        : freshness === "very_stale"
          ? "#c2410c"
          : "#6b7280";

  const label = lastSyncedAt
    ? freshness === "fresh"
      ? `Synced ${formatTimeAgo(lastSyncedAt)}`
      : freshness === "stale"
        ? `Stale but usable · ${formatTimeAgo(lastSyncedAt)}`
        : `Very stale · ${formatTimeAgo(lastSyncedAt)}`
    : "Offline only";

  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${bgColor} ${className ?? ""}`}>
      <Clock size={12} color={iconColor} />
      <Text className={`text-xs font-medium ${textColor}`}>{label}</Text>
    </View>
  );
}
