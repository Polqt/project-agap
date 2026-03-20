import * as NetInfo from "@react-native-community/netinfo";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";


import { useAuth } from "@/providers/AuthProvider";
import { connectivityStore } from "@/stores/connectivity.store";
import { trpcClient } from "@/utils/trpc";
import { QueuedAction } from "@/types/offline";
import { deleteQueuedAction, insertQueuedAction, listQueuedActions, updateQueuedActionRetries } from "@/services/offlineQueueDb";

export type OfflineQueueContextValue = {
  enqueue: (action: Omit<QueuedAction, "id" | "createdAt" | "retries">) => Promise<void>;
  queueSize: number;
  isFlushing: boolean;
};

export const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

function createQueueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function executeQueuedAction(action: QueuedAction) {
  if (action.type === "status_ping") {
    await trpcClient.statusPings.submit.mutate(action.payload as never);
    return;
  }

  const mutation = action.payload.mutation;
  const input = action.payload.input;

  if (mutation === "byQr") {
    await trpcClient.checkIns.byQr.mutate(input as never);
    return;
  }

  if (mutation === "proxy") {
    await trpcClient.checkIns.proxy.mutate(input as never);
    return;
  }

  await trpcClient.checkIns.manual.mutate((input ?? action.payload) as never);
}

export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);
  const isMountedRef = useRef(true);
  const isFlushingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    const nextQueue = await listQueuedActions();

    if (!isMountedRef.current) {
      return [];
    }

    setQueue(nextQueue);
    connectivityStore.setState((state) => ({
      ...state,
      queueSize: nextQueue.length,
    }));
    return nextQueue;
  }, []);

  const flushQueue = useCallback(async () => {
    if (!session || isFlushingRef.current) {
      return;
    }

    const networkState = await NetInfo.fetch();
    const isOnline = !!networkState.isConnected && !!networkState.isInternetReachable;
    connectivityStore.setState((state) => ({
      ...state,
      isOnline,
    }));

    if (!isOnline) {
      return;
    }

    isFlushingRef.current = true;
    setIsFlushing(true);

    try {
      const pendingQueue = await refreshQueue();

      for (const action of pendingQueue) {
        try {
          await executeQueuedAction(action);
          await deleteQueuedAction(action.id);
        } catch {
          const nextRetries = action.retries + 1;

          if (nextRetries >= 3) {
            await deleteQueuedAction(action.id);
          } else {
            await updateQueuedActionRetries(action.id, nextRetries);
            await sleep(2 ** action.retries * 1000);
          }
        }
      }

      await refreshQueue();
    } finally {
      isFlushingRef.current = false;
      if (isMountedRef.current) {
        setIsFlushing(false);
      }
    }
  }, [refreshQueue, session]);

  useEffect(() => {
    isMountedRef.current = true;
    void refreshQueue();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && !!state.isInternetReachable;
      connectivityStore.setState((current) => ({
        ...current,
        isOnline,
      }));

      if (isOnline) {
        void flushQueue();
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [flushQueue, refreshQueue]);

  const enqueue = useCallback<OfflineQueueContextValue["enqueue"]>(
    async (action) => {
      await insertQueuedAction({
        id: createQueueId(),
        createdAt: Date.now(),
        retries: 0,
        ...action,
      });

      await refreshQueue();
    },
    [refreshQueue],
  );

  const value = useMemo<OfflineQueueContextValue>(
    () => ({
      enqueue,
      queueSize: queue.length,
      isFlushing,
    }),
    [enqueue, isFlushing, queue.length],
  );

  return <OfflineQueueContext.Provider value={value}>{children}</OfflineQueueContext.Provider>;
}
