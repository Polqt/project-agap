import { useStore } from "@tanstack/react-store";
import { Text, View } from "react-native";

import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { appShellStore } from "@/stores/app-shell-store";

export function OfflineBanner() {
  const { isOnline, isFlushing } = useOfflineQueue();
  const pendingQueueCount = useStore(appShellStore, (state) => state.pendingQueueCount);
  const failedQueueCount = useStore(appShellStore, (state) => state.failedQueueCount);
  const syncStatus = useStore(appShellStore, (state) => state.syncStatus);

  if (isOnline && !isFlushing && pendingQueueCount === 0 && failedQueueCount === 0) {
    return null;
  }

  const isOffline = !isOnline || syncStatus === "offline";
  const toneClasses = isOffline
    ? "bg-amber-100 border-amber-300"
    : failedQueueCount > 0
      ? "bg-rose-100 border-rose-300"
      : "bg-blue-100 border-blue-300";

  const statusLabel = isOffline
    ? "Offline"
    : isFlushing || syncStatus === "syncing"
      ? "Syncing"
      : "Online";

  return (
    <View className={`border-b px-4 py-2 ${toneClasses}`}>
      <Text className="text-xs font-semibold text-slate-800">
        {statusLabel} · {pendingQueueCount} queued · {failedQueueCount} failed
      </Text>
    </View>
  );
}
