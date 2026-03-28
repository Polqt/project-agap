export type OfflineActionType =
  | "status-ping.submit"
  | "check-in.qr"
  | "check-in.manual"
  | "check-in.proxy";

export type StatusPingQueuePayload = {
  householdId?: string | null;
  status: "safe" | "need_help";
  message?: string | null;
  latitude?: number;
  longitude?: number;
};

export type CheckInQrQueuePayload = {
  qrToken: string;
  householdId?: string | null;
  latitude?: number;
  longitude?: number;
};

export type CheckInManualQueuePayload = {
  centerId: string;
  householdId?: string | null;
  notes?: string | null;
  latitude?: number;
  longitude?: number;
};

export type CheckInProxyQueuePayload = {
  centerId: string;
  householdId: string;
  memberIds: string[];
  notes?: string | null;
  latitude?: number;
  longitude?: number;
};

export type OfflinePayloadMap = {
  "status-ping.submit": StatusPingQueuePayload;
  "check-in.qr": CheckInQrQueuePayload;
  "check-in.manual": CheckInManualQueuePayload;
  "check-in.proxy": CheckInProxyQueuePayload;
};

export type QueuedAction<TType extends OfflineActionType = OfflineActionType> = {
  id: string;
  type: TType;
  payload: OfflinePayloadMap[TType];
  createdAt: number;
  retries: number;
};

export type OfflineQueueRow = {
  id: string;
  type: OfflineActionType;
  payload: string;
  created_at: number;
  retries: number;
};
