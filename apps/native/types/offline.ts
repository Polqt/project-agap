export type WelfareOutcomeQueued = "safe" | "need_help" | "not_home" | "dispatch_again";

export type WelfareRecordOutcomeQueuePayload = {
  householdId: string;
  outcome: WelfareOutcomeQueued;
};

export type OfflineActionType =
  | "status-ping.submit"
  | "check-in.qr"
  | "check-in.manual"
  | "check-in.proxy"
  | "welfare.recordOutcome";

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
  "welfare.recordOutcome": WelfareRecordOutcomeQueuePayload;
};

export type QueuedAction<TType extends OfflineActionType = OfflineActionType> = {
  id: string;
  type: TType;
  payload: OfflinePayloadMap[TType];
  createdAt: number;
  retries: number;
  failedAt: number | null;
  lastError: string | null;
};

export type OfflineQueueRow = {
  id: string;
  type: OfflineActionType;
  payload: string;
  created_at: number;
  retries: number;
  failed_at: number | null;
  last_error: string | null;
};
