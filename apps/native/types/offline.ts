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
  | "household.register"
  | "check-in.qr"
  | "check-in.manual"
  | "check-in.proxy"
  | "welfare.recordOutcome"
  | "needs-report.submit"
  | "broadcast.create"
  | "household.update-status"
  | "household.assign-welfare"
  | "center.toggle-open"
  | "center.rotate-qr"
  | "center.update-supplies"
  | "missing-person.report"
  | "missing-person.mark-found"
  | "profile.update"
  | "profile.set-pinned-location"
  | "profile.clear-pinned-location"
  | "barangay.set-resident-access";

export type StatusPingQueuePayload = {
  householdId?: string | null;
  status: "safe" | "need_help";
  message?: string | null;
  latitude?: number;
  longitude?: number;
  clientMutationId?: string;
};

export type HouseholdRegisterQueuePayload = {
  householdHead: string;
  purok: string;
  address: string;
  phoneNumber?: string | null;
  totalMembers: number;
  isSmsOnly: boolean;
  vulnerabilityFlags: Array<
    "elderly" | "pwd" | "infant" | "pregnant" | "solo_parent" | "chronic_illness"
  >;
  members: Array<{
    fullName: string;
    age?: number | null;
    vulnerabilityFlags: Array<
      "elderly" | "pwd" | "infant" | "pregnant" | "solo_parent" | "chronic_illness"
    >;
    notes?: string | null;
  }>;
  notes?: string | null;
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

export type HouseholdUpdateStatusQueuePayload = {
  householdId: string;
  evacuationStatus:
    | "home"
    | "evacuating"
    | "checked_in"
    | "safe"
    | "need_help"
    | "unknown"
    | "not_home"
    | "welfare_check_dispatched";
  expectedUpdatedAt?: string | null;
  clientMutationId?: string;
};

export type HouseholdAssignWelfareQueuePayload = {
  householdId: string;
  assigneeProfileId?: string;
  expectedUpdatedAt?: string | null;
  clientMutationId?: string;
};

export type CenterToggleOpenQueuePayload = {
  centerId: string;
  isOpen: boolean;
  expectedUpdatedAt?: string | null;
  clientMutationId?: string;
};

export type CenterRotateQrQueuePayload = {
  centerId: string;
  clientMutationId?: string;
};

export type CenterUpdateSuppliesQueuePayload = {
  centerId: string;
  foodPacks?: number;
  waterLiters?: number;
  medicineUnits?: number;
  blankets?: number;
  expectedUpdatedAt?: string | null;
  clientMutationId?: string;
};

export type MissingPersonReportQueuePayload = {
  fullName: string;
  age?: number;
  lastSeenLocation?: string;
  description?: string;
  clientMutationId?: string;
};

export type MissingPersonMarkFoundQueuePayload = {
  id: string;
  clientMutationId?: string;
};

export type ProfileUpdateQueuePayload = {
  fullName?: string;
  phoneNumber?: string | null;
  barangayId?: string | null;
  purok?: string | null;
  isSmsOnly?: boolean;
  clientMutationId?: string;
};

export type ProfileSetPinnedLocationQueuePayload = {
  latitude: number;
  longitude: number;
  clientMutationId?: string;
};

export type ProfileClearPinnedLocationQueuePayload = {
  clientMutationId?: string;
};

export type BarangaySetResidentAccessQueuePayload = {
  pingEnabled: boolean;
  checkInEnabled: boolean;
  expectedUpdatedAt?: string | null;
  clientMutationId?: string;
};

export type OfflinePayloadMap = {
  "status-ping.submit": StatusPingQueuePayload;
  "household.register": HouseholdRegisterQueuePayload;
  "check-in.qr": CheckInQrQueuePayload;
  "check-in.manual": CheckInManualQueuePayload;
  "check-in.proxy": CheckInProxyQueuePayload;
  "welfare.recordOutcome": WelfareRecordOutcomeQueuePayload;
  "needs-report.submit": NeedsReportSubmitQueuePayload;
  "broadcast.create": BroadcastCreateQueuePayload;
  "household.update-status": HouseholdUpdateStatusQueuePayload;
  "household.assign-welfare": HouseholdAssignWelfareQueuePayload;
  "center.toggle-open": CenterToggleOpenQueuePayload;
  "center.rotate-qr": CenterRotateQrQueuePayload;
  "center.update-supplies": CenterUpdateSuppliesQueuePayload;
  "missing-person.report": MissingPersonReportQueuePayload;
  "missing-person.mark-found": MissingPersonMarkFoundQueuePayload;
  "profile.update": ProfileUpdateQueuePayload;
  "profile.set-pinned-location": ProfileSetPinnedLocationQueuePayload;
  "profile.clear-pinned-location": ProfileClearPinnedLocationQueuePayload;
  "barangay.set-resident-access": BarangaySetResidentAccessQueuePayload;
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
