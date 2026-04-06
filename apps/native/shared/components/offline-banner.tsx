import { useStore } from "@tanstack/react-store";
import { useSegments } from "expo-router";
import { Text, View } from "react-native";

import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { appShellStore } from "@/stores/app-shell-store";

const SUPPRESSED_SEGMENTS = ["map"];

export function OfflineBanner() {
  const segments = useSegments();
  const { isOnline, isFlushing } = useOfflineQueue();
  const pendingQueueCount = useStore(appShellStore, (state) => state.pendingQueueCount);
  const syncStatus = useStore(appShellStore, (state) => state.syncStatus);

  // Don't show on map screen — it overlaps the map controls
  const lastSegment = segments[segments.length - 1];
  if (SUPPRESSED_SEGMENTS.includes(lastSegment ?? "")) {
    return null;
  }

  const isOffline = !isOnline || syncStatus === "offline";
  const isDegraded = syncStatus === "degraded";
  const isSyncing = isFlushing || syncStatus === "syncing";
  const hasPending = pendingQueueCount > 0;

  // Only show for truly actionable states — not when online with pending items that are quietly retrying
  const shouldShow = isOffline || isDegraded || isSyncing;

  if (!shouldShow && !hasPending) {
    return null;
  }

  if (!shouldShow) {
    return null;
  }

  type Tone = "offline" | "weak" | "syncing";

  const tone: Tone = isOffline ? "offline" : isDegraded ? "weak" : "syncing";

  const toneStyle: Record<Tone, string> = {
    offline: "bg-amber-50 border-amber-200",
    weak:    "bg-orange-50 border-orange-200",
    syncing: "bg-blue-50 border-blue-200",
  };

  const dotColor: Record<Tone, string> = {
    offline: "bg-amber-500",
    weak:    "bg-orange-500",
    syncing: "bg-blue-400",
  };

  const label: Record<Tone, string> = {
    offline: "Offline",
    weak:    "Weak signal",
    syncing: "Syncing…",
  };

  return (
    <View className="pointer-events-none absolute bottom-24 left-4 right-4 z-50">
      <View className={`flex-row items-center gap-2.5 rounded-2xl border px-4 py-2.5 shadow-sm ${toneStyle[tone]}`}>
        <View className={`h-2 w-2 rounded-full ${dotColor[tone]}`} />
        <Text className="text-xs font-semibold text-slate-700">{label[tone]}</Text>
        {pendingQueueCount > 0 && (isSyncing || isOffline) ? (
          <>
            <View className="h-3 w-px bg-slate-200" />
            <Text className="text-xs text-slate-500">
              {pendingQueueCount} action{pendingQueueCount > 1 ? "s" : ""} queued
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
