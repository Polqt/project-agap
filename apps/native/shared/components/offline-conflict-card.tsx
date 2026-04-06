import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import {
  formatConflictAge,
  getOfflineConflictActions,
  getQueuedActionLabel,
} from "@/shared/utils/offline-conflicts";

import { AppButton } from "./ui";

type Props = {
  onRefresh: () => Promise<void>;
  refreshLabel?: string;
};

export function OfflineConflictCard({
  onRefresh,
  refreshLabel = "Refresh latest data",
}: Props) {
  const { isOnline, isFlushing, pendingActions, retryFailedActions } = useOfflineQueue();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const conflictActions = useMemo(
    () => getOfflineConflictActions(pendingActions),
    [pendingActions],
  );

  if (conflictActions.length === 0) {
    return null;
  }

  async function handleRefresh() {
    if (!isOnline) {
      setFeedback("Reconnect first so the device can refresh the latest server state.");
      return;
    }

    setFeedback(null);
    setIsRefreshing(true);

    try {
      await onRefresh();
      setFeedback("Latest server data loaded. Review the current values, then retry the blocked actions.");
    } catch {
      setFeedback("Refresh failed. The device is still working from the last offline snapshot.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRetryConflicts() {
    setFeedback(null);
    setIsRetrying(true);

    try {
      await retryFailedActions(conflictActions.map((action) => action.id));
      setFeedback(
        isOnline
          ? "Conflict actions moved back to the sync queue."
          : "Conflict actions are ready to retry when the connection returns.",
      );
    } catch {
      setFeedback("Could not move the blocked actions back into the sync queue.");
    } finally {
      setIsRetrying(false);
    }
  }

  const visibleActions = isExpanded ? conflictActions : conflictActions.slice(0, 3);

  return (
    <View className="mt-4 rounded-2xl border border-rose-200 bg-white p-4">
      <View className="mb-4 flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-slate-950">Sync conflicts need review</Text>
          <Text className="text-sm leading-6 text-slate-500">
            Another official changed the same live record while this device was offline. Refresh first so you can compare the latest values before retrying.
          </Text>
        </View>
        <View className="rounded-full bg-rose-100 px-3 py-1">
          <Text className="text-xs font-semibold text-rose-700">{conflictActions.length} blocked</Text>
        </View>
      </View>

      <View className="gap-3">
        {visibleActions.map((action) => (
          <View key={action.id} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-rose-950">
                  {getQueuedActionLabel(action.type)}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-rose-700">
                  {action.lastError ?? "This action needs a fresh copy of the record before it can be retried."}
                </Text>
              </View>
              <Text className="text-[11px] font-medium text-rose-700">
                {formatConflictAge(action.failedAt)}
              </Text>
            </View>
          </View>
        ))}

        {conflictActions.length > 3 ? (
          <Pressable onPress={() => setIsExpanded((current) => !current)} className="self-start">
            <Text className="text-sm font-semibold text-blue-700">
              {isExpanded ? "Show fewer conflicts" : `Show all ${conflictActions.length} conflicts`}
            </Text>
          </Pressable>
        ) : null}

        {feedback ? (
          <View className="rounded-2xl bg-slate-100 px-4 py-3">
            <Text className="text-xs leading-5 text-slate-600">{feedback}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <AppButton
            label={refreshLabel}
            onPress={() => void handleRefresh()}
            variant="secondary"
            disabled={!isOnline}
            loading={isRefreshing || isFlushing}
          />
          <AppButton
            label={isOnline ? "Retry blocked actions" : "Stage blocked actions for retry"}
            onPress={() => void handleRetryConflicts()}
            variant="ghost"
            loading={isRetrying}
          />
        </View>
      </View>
    </View>
  );
}
