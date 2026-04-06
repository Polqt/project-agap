import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { OfflineQueueContext } from "@/shared/hooks/useOfflineQueue";
import {
  deleteQueuedAction,
  insertQueuedAction,
  listQueuedActions,
  markQueuedActionFailed,
  resetFailedQueuedActions,
  resetFailedQueuedActionsByIds,
  updateQueuedActionRetries,
} from "@/services/offlineQueueDb";
import {
  getRetryDelayMs,
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
  const [isWeakConnection, setIsWeakConnection] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const isFlushingRef = useRef(false);
  const isOnlineRef = useRef(true);
  const isWeakConnectionRef = useRef(false);

  const updateConnectivity = useCallback((state: NetInfoState) => {
    const nextOnline = state.isConnected !== false;
    // Only treat as weak when explicitly confirmed: 2G/3G cellular or internet
    // reachability explicitly false. Null/unknown generation (4G/LTE reporting as
    // null on some Android versions) should NOT be treated as weak.
    const nextWeakConnection =
      nextOnline &&
      (state.isInternetReachable === false ||
        (state.type === "cellular" &&
          (state.details?.cellularGeneration === "2g" ||
            state.details?.cellularGeneration === "3g")));

    isOnlineRef.current = nextOnline;
    isWeakConnectionRef.current = nextWeakConnection;
    setIsOnline(nextOnline);
    setIsWeakConnection(nextWeakConnection);
    setSyncStatus(nextOnline ? (nextWeakConnection ? "degraded" : "online") : "offline");
  }, []);

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

          // Continue processing remaining queued actions instead of breaking.
          // This ensures that one failed action doesn't block the entire queue.
          continue;
        }
      }
    } finally {
      await refreshPendingActions();
      setIsFlushing(false);
      isFlushingRef.current = false;
      setSyncStatus(
        isOnlineRef.current ? (isWeakConnectionRef.current ? "degraded" : "online") : "offline",
      );
    }
  }, [refreshPendingActions]);

  const retryFailedActions = useCallback(async (actionIds?: string[]) => {
    if (actionIds && actionIds.length > 0) {
      await resetFailedQueuedActionsByIds(actionIds);
    } else {
      await resetFailedQueuedActions();
    }

    await refreshPendingActions();
    if (isOnline) {
      await flushQueue();
    }
  }, [flushQueue, isOnline, refreshPendingActions]);

  useEffect(() => {
    async function bootstrapQueueState() {
      await refreshPendingActions();
      const initialState = await NetInfo.fetch();
      const nextOnline = initialState.isConnected !== false;
      updateConnectivity(initialState);

      if (nextOnline) {
        await flushQueue();
      }
    }

    void bootstrapQueueState();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = state.isConnected !== false;
      updateConnectivity(state);

      if (nextOnline) {
        void flushQueue();
      }
    });

    const appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active") {
        return;
      }

      void NetInfo.fetch().then((state) => {
        const nextOnline = state.isConnected !== false;
        updateConnectivity(state);

        if (nextOnline) {
          void flushQueue();
        }
      });
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [flushQueue, refreshPendingActions, updateConnectivity]);

  const value = useMemo(
    () => ({
      isOnline,
      isWeakConnection,
      isFlushing,
      pendingActions,
      queueAction,
      flushQueue,
      retryFailedActions,
    }),
    [flushQueue, isFlushing, isOnline, isWeakConnection, pendingActions, queueAction, retryFailedActions],
  );

  return <OfflineQueueContext.Provider value={value}>{children}</OfflineQueueContext.Provider>;
}
