export type QueuedAction = {
  id: string;
  type: "status_ping" | "check_in";
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
};

export type OfflineQueueRow = {
  id: string;
  type: QueuedAction["type"];
  payload: string;
  created_at: number;
  retries: number;
};