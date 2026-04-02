import type { AppRole } from "@project-agap/api/supabase";
import { Store } from "@tanstack/store";

type AppShellState = {
  selectedRole: AppRole | null;
  pendingQueueCount: number;
  failedQueueCount: number;
  syncStatus: "online" | "offline" | "syncing";
  lastStatusPing: {
    status: "safe" | "need_help";
    createdAt: number;
    source: "server" | "queue";
  } | null;
};

const initialState: AppShellState = {
  selectedRole: null,
  pendingQueueCount: 0,
  failedQueueCount: 0,
  syncStatus: "online",
  lastStatusPing: null,
};

export const appShellStore = new Store(initialState);

export function setSelectedRole(role: AppRole | null) {
  appShellStore.setState((state) => ({
    ...state,
    selectedRole: role,
  }));
}

export function setPendingQueueCount(pendingQueueCount: number) {
  appShellStore.setState((state) => ({
    ...state,
    pendingQueueCount,
  }));
}

export function setFailedQueueCount(failedQueueCount: number) {
  appShellStore.setState((state) => ({
    ...state,
    failedQueueCount,
  }));
}

export function setSyncStatus(syncStatus: AppShellState["syncStatus"]) {
  appShellStore.setState((state) => ({
    ...state,
    syncStatus,
  }));
}

export function setLastStatusPing(
  status: AppShellState["lastStatusPing"],
) {
  appShellStore.setState((state) => ({
    ...state,
    lastStatusPing: status,
  }));
}

export function resetAppShellStore() {
  appShellStore.setState(() => initialState);
}
