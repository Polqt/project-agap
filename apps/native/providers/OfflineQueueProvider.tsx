import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { OfflineQueueContext } from "@/shared/hooks/useOfflineQueue";
import {
  deleteQueuedAction,
  insertQueuedAction,
  listQueuedActions,
  markQueuedActionFailed,
  updateQueuedActionRetries,
} from "@/services/offlineQueueDb";
import {
  getRetryDelayMs,
  isExpiredQueuedAction,
  MAX_QUEUE_RETRIES,
  replayQueuedAction,
} from "@/services/offlineQueueActions";
import {
  projectQueuedActionLocally,
  syncQueuedActionDatasets,
} from "@/services/offlineQueueProjection";
import { appShellStore, setSyncStatus } from "@/stores/app-shell-store";
import { bumpOfflineDataGeneration } from "@/stores/offline-data-store";
import type { QueuedAction } from "@/types/offline";

export function OfflineQueueProvider({ children }: PropsWithChildren) {
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);
  const isFlushingRef = useRef(false);

  const refreshPendingActions = useCallback(async () => {
    const actions = await listQueuedActions();
    const pendingCount = actions.filter((action) => action.failedAt === null).length;
    const failedCount = actions.length - pendingCount;
    setPendingActions(actions);
    appShellStore.setState((state) => ({
      ...state,
      pendingQueueCount: pendingCount,
      failedQueueCount: failedCount,
    }));
    return actions;
  }, []);

  const queueAction = useCallback(
    async (action: QueuedAction) => {
      await insertQueuedAction(action);
      await projectQueuedActionLocally(action);
      bumpOfflineDataGeneration();
      await refreshPendingActions();
    },
    [refreshPendingActions],
  );

  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current) {
      return;
    }

    isFlushingRef.current = true;
    setIsFlushing(true);
    setSyncStatus("syncing");

    try {
      const actions = await listQueuedActions();

      for (const action of actions) {
        if (action.failedAt !== null) {
          continue;
        }

        if (isExpiredQueuedAction(action)) {
          await deleteQueuedAction(action.id);
          continue;
        }

        try {
          await replayQueuedAction(action);
          await syncQueuedActionDatasets(action).catch(() => {});
          bumpOfflineDataGeneration();
          await deleteQueuedAction(action.id);
        } catch (error) {
          const nextRetries = action.retries + 1;

          if (nextRetries >= MAX_QUEUE_RETRIES) {
            const message =
              error instanceof Error ? error.message : "Exceeded maximum retry attempts.";
            await markQueuedActionFailed(action.id, message);
            continue;
          }

          await updateQueuedActionRetries(action.id, nextRetries);
          await new Promise((resolve) => setTimeout(resolve, getRetryDelayMs(nextRetries - 1)));

          // Avoid repeatedly processing the rest of the queue in the same cycle when
          // the backend/session is currently failing; retry on the next online event.
          break;
        }
      }
    } finally {
      await refreshPendingActions();
      setIsFlushing(false);
      isFlushingRef.current = false;
      setSyncStatus(isOnline ? "online" : "offline");
    }
  }, [isOnline, refreshPendingActions]);

  useEffect(() => {
    async function bootstrapQueueState() {
      await refreshPendingActions();
    }

    void bootstrapQueueState();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(nextOnline);
      setSyncStatus(nextOnline ? "online" : "offline");

      if (nextOnline) {
        void flushQueue();
      }
    });

    return unsubscribe;
  }, [flushQueue, refreshPendingActions]);

  const value = useMemo(
    () => ({
      isOnline,
      isFlushing,
      pendingActions,
      queueAction,
      flushQueue,
    }),
    [flushQueue, isFlushing, isOnline, pendingActions, queueAction],
  );

  return <OfflineQueueContext.Provider value={value}>{children}</OfflineQueueContext.Provider>;
}
