import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { OfflineQueueContext } from "@/shared/hooks/useOfflineQueue";
import {
  deleteQueuedAction,
  insertQueuedAction,
  listQueuedActions,
  updateQueuedActionRetries,
} from "@/services/offlineQueueDb";
import { isExpiredQueuedAction, replayQueuedAction } from "@/services/offlineQueueActions";
import { setPendingQueueCount } from "@/stores/app-shell-store";
import type { QueuedAction } from "@/types/offline";

function getRetryDelayMs(retries: number) {
  return Math.min(2 ** retries * 250, 5000);
}

export function OfflineQueueProvider({ children }: PropsWithChildren) {
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);

  const refreshPendingActions = useCallback(async () => {
    const actions = await listQueuedActions();
    setPendingActions(actions);
    setPendingQueueCount(actions.length);
    return actions;
  }, []);

  const queueAction = useCallback(
    async (action: QueuedAction) => {
      await insertQueuedAction(action);
      await refreshPendingActions();
    },
    [refreshPendingActions],
  );

  const flushQueue = useCallback(async () => {
    if (isFlushing) {
      return;
    }

    setIsFlushing(true);

    try {
      const actions = await listQueuedActions();

      for (const action of actions) {
        if (isExpiredQueuedAction(action)) {
          await deleteQueuedAction(action.id);
          continue;
        }

        try {
          await replayQueuedAction(action);
          await deleteQueuedAction(action.id);
        } catch {
          const nextRetries = action.retries + 1;
          await updateQueuedActionRetries(action.id, nextRetries);
          await new Promise((resolve) => {
            setTimeout(resolve, getRetryDelayMs(nextRetries));
          });
        }
      }
    } finally {
      await refreshPendingActions();
      setIsFlushing(false);
    }
  }, [isFlushing, refreshPendingActions]);

  useEffect(() => {
    void refreshPendingActions();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(nextOnline);

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
