export type WelfareOutcomeQueued = "safe" | "need_help" | "not_home" | "dispatch_again";

export type QueueScopeMeta = {
  scopeId: string;
  barangayId: string;
  profileId: string;
};

export type WelfareRecordOutcomeQueuePayload = {
  householdId: string;
  outcome: WelfareOutcomeQueued;
  expectedUpdatedAt?: string | null;
  clientMutationId?: string;
};

export type OfflineActionType =
  | "status-ping.submit"
  | "check-in.qr"
  | "check-in.manual"
  | "check-in.proxy"
  | "welfare.recordOutcome"
  | "needs-report.submit"
  | "broadcast.create";

export type StatusPingQueuePayload = {
  householdId?: string | null;
  status: "safe" | "need_help";
  message?: string | null;
  latitude?: number;
  longitude?: number;
  clientMutationId?: string;
};

export type CheckInQrQueuePayload = {
  qrToken: string;
  householdId?: string | null;
  latitude?: number;
  longitude?: number;
  clientMutationId?: string;
};

export type CheckInManualQueuePayload = {
  centerId: string;
  householdId?: string | null;
  notes?: string | null;
  latitude?: number;
  longitude?: number;
  clientMutationId?: string;
};

export type CheckInProxyQueuePayload = {
  centerId: string;
  householdId: string;
  memberIds: string[];
  notes?: string | null;
  latitude?: number;
  longitude?: number;
  clientMutationId?: string;
};

export type NeedsReportSubmitQueuePayload = {
  centerId?: string;
  totalEvacuees: number;
  needsFoodPacks: number;
  needsWaterLiters: number;
  needsBlankets: number;
  needsMedicine: boolean;
  medicalCases?: string;
  notes?: string;
  clientMutationId?: string;
};

export type BroadcastCreateQueuePayload = {
  broadcastId?: string;
  sentAt?: string;
  broadcastType: "evacuate_now" | "stay_alert" | "all_clear" | "custom";
  message: string;
  messageFilipino?: string | null;
  targetPurok?: string | null;
  clientMutationId?: string;
};

export type OfflinePayloadMap = {
  "status-ping.submit": StatusPingQueuePayload;
  "check-in.qr": CheckInQrQueuePayload;
  "check-in.manual": CheckInManualQueuePayload;
  "check-in.proxy": CheckInProxyQueuePayload;
  "welfare.recordOutcome": WelfareRecordOutcomeQueuePayload;
  "needs-report.submit": NeedsReportSubmitQueuePayload;
  "broadcast.create": BroadcastCreateQueuePayload;
};

export type QueuedAction<TType extends OfflineActionType = OfflineActionType> = {
  id: string;
  type: TType;
  payload: OfflinePayloadMap[TType];
  meta?: QueueScopeMeta | null;
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
