import type { QueuedAction } from "@/types/offline";
import { createContext, useContext } from "react";

export type OfflineQueueContextValue = {
  isOnline: boolean;
  isFlushing: boolean;
  pendingActions: QueuedAction[];
  queueAction: (action: QueuedAction) => Promise<void>;
  flushQueue: () => Promise<void>;
  retryFailedActions: (actionIds?: string[]) => Promise<void>;
};

export const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

export function useOfflineQueue() {
  const context = useContext(OfflineQueueContext);

  if (!context) {
    throw new Error("useOfflineQueue must be used within OfflineQueueProvider.");
  }

  return context;
}
