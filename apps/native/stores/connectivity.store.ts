import { Store } from "@tanstack/store";

export type ConnectivityStoreState = {
  isOnline: boolean;
  queueSize: number;
};

export const connectivityStore = new Store<ConnectivityStoreState>({
  isOnline: true,
  queueSize: 0,
});
