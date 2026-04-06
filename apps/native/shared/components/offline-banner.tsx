import { useStore } from "@tanstack/react-store";
import { Text, View } from "react-native";

import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { appShellStore } from "@/stores/app-shell-store";

export function OfflineBanner() {
  const { isOnline, isFlushing } = useOfflineQueue();
  const pendingQueueCount = useStore(appShellStore, (state) => state.pendingQueueCount);
  const failedQueueCount = useStore(appShellStore, (state) => state.failedQueueCount);
  const syncStatus = useStore(appShellStore, (state) => state.syncStatus);
  const shouldShow = !isOnline || syncStatus === "degraded" || failedQueueCount > 0 || pendingQueueCount > 0;

  if (!shouldShow) {
    return null;
  }

  const isOffline = !isOnline || syncStatus === "offline";
  const isDegraded = syncStatus === "degraded";
  const isSyncing = isFlushing || syncStatus === "syncing";

  type Tone = "offline" | "weak" | "failed" | "syncing" | "queued";

  const tone: Tone = isOffline
    ? "offline"
    : isDegraded
      ? "weak"
      : failedQueueCount > 0
        ? "failed"
        : isSyncing
          ? "syncing"
          : "queued";

  const toneStyle: Record<Tone, string> = {
    offline: "bg-amber-50 border-amber-300",
    weak:    "bg-orange-50 border-orange-300",
    failed:  "bg-rose-50 border-rose-300",
    syncing: "bg-blue-50 border-blue-300",
    queued:  "bg-slate-50 border-slate-300",
  };

  const dotColor: Record<Tone, string> = {
    offline: "bg-amber-500",
    weak:    "bg-orange-500",
    failed:  "bg-rose-500",
    syncing: "bg-blue-500",
    queued:  "bg-slate-400",
  };

  const label: Record<Tone, string> = {
    offline: "Offline",
    weak:    "Weak signal",
    failed:  "Sync error",
    syncing: "Syncing…",
    queued:  "Pending sync",
  };

  const sub =
    failedQueueCount > 0 && pendingQueueCount > 0
      ? `${pendingQueueCount} pending · ${failedQueueCount} failed`
      : failedQueueCount > 0
        ? `${failedQueueCount} action${failedQueueCount > 1 ? "s" : ""} failed`
        : pendingQueueCount > 0
          ? `${pendingQueueCount} action${pendingQueueCount > 1 ? "s" : ""} queued`
          : null;

  return (
    <View className="pointer-events-none absolute bottom-24 left-4 right-4 z-50">
      <View className={`flex-row items-center gap-2.5 rounded-2xl border px-4 py-2.5 shadow-sm ${toneStyle[tone]}`}>
        <View className={`h-2 w-2 rounded-full ${dotColor[tone]}`} />
        <Text className="text-xs font-semibold text-slate-800">{label[tone]}</Text>
        {sub ? (
          <>
            <View className="h-3 w-px bg-slate-300" />
            <Text className="text-xs text-slate-500">{sub}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
