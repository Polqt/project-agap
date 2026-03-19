import { useContext } from "react";

import { OfflineQueueContext } from "@/providers/OfflineQueueProvider";

export function useOfflineQueue() {
  const context = useContext(OfflineQueueContext);

  if (!context) {
    throw new Error("useOfflineQueue must be used within OfflineQueueProvider");
  }

  return context;
}
