import { Store } from "@tanstack/store";

type OfflineDataState = {
  generation: number;
  isSyncing: boolean;
  lastSyncedAt: number | null;
};

const initialState: OfflineDataState = {
  generation: 0,
  isSyncing: false,
  lastSyncedAt: null,
};

export const offlineDataStore = new Store(initialState);

export function setOfflineDataSyncing(isSyncing: boolean) {
  offlineDataStore.setState((state) => ({
    ...state,
    isSyncing,
  }));
}

export function bumpOfflineDataGeneration(lastSyncedAt = Date.now()) {
  offlineDataStore.setState((state) => ({
    generation: state.generation + 1,
    isSyncing: false,
    lastSyncedAt,
  }));
}
