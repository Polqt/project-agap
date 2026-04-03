import type {
  AlertSeverity,
  AlertSource,
  AppRole,
  BroadcastType,
  CheckInMethod,
  EvacuationStatus,
  IncidentReportGenerationSource,
  NeedsReportStatus,
  PingStatus,
  PushPlatform,
  SmsDeliveryStatus,
  SmsDirection,
  SmsKeyword,
  VulnerabilityFlag,
} from "./types";
import type {
  AlertLevel,
  GeoPoint,
  NullableGeoPoint,
  PingChannel,
  ReadonlyMutationShape,
  Timestamped,
  TimestampedUpdated,
} from "./database-shared";

export type ProfilesRow = TimestampedUpdated & {
  id: string;
  role: AppRole;
  full_name: string;
  phone_number: string | null;
  barangay_id: string | null;
  purok: string | null;
  is_sms_only: boolean;
};
export type ProfilesInsert = ReadonlyMutationShape<ProfilesRow, "updated_at", "id">;
export type ProfilesUpdate = ReadonlyMutationShape<ProfilesRow, "created_at" | "updated_at">;

export type BarangaysRow = TimestampedUpdated &
  GeoPoint & {
    id: string;
    name: string;
    municipality: string;
    province: string;
    region: string;
    alert_level: AlertLevel;
    active_alert_text: string | null;
    total_households: number;
  };
export type BarangaysInsert = ReadonlyMutationShape<
  BarangaysRow,
  "created_at" | "updated_at",
  "name" | "municipality" | "province" | "latitude" | "longitude"
>;
export type BarangaysUpdate = ReadonlyMutationShape<BarangaysRow, "created_at" | "updated_at">;

export type EvacuationCentersRow = TimestampedUpdated &
  GeoPoint & {
    id: string;
    barangay_id: string;
    name: string;
    address: string;
    capacity: number;
    is_open: boolean;
    contact_number: string | null;
    notes: string | null;
    qr_code_token: string | null;
    current_occupancy: number;
  };
export type EvacuationCentersInsert = ReadonlyMutationShape<
  EvacuationCentersRow,
  "created_at" | "updated_at",
  "barangay_id" | "name" | "latitude" | "longitude"
>;
export type EvacuationCentersUpdate = ReadonlyMutationShape<
  EvacuationCentersRow,
  "created_at" | "updated_at"
>;

export type EvacuationRoutesRow = TimestampedUpdated & {
  id: string;
  barangay_id: string;
  center_id: string;
  name: string;
  purok_origin: string | null;
  route_geojson: Record<string, unknown>;
  distance_meters: number | null;
  estimated_walk_minutes: number | null;
  color_hex: string;
  is_accessible: boolean;
  notes: string | null;
};
export type EvacuationRoutesInsert = ReadonlyMutationShape<
  EvacuationRoutesRow,
  "created_at" | "updated_at",
  "barangay_id" | "center_id" | "name" | "route_geojson"
>;
export type EvacuationRoutesUpdate = ReadonlyMutationShape<
  EvacuationRoutesRow,
  "created_at" | "updated_at"
>;

export type HouseholdsRow = TimestampedUpdated & {
  id: string;
  barangay_id: string;
  registered_by: string | null;
  household_head: string;
  purok: string;
  address: string;
  phone_number: string | null;
  total_members: number;
  vulnerability_flags: VulnerabilityFlag[];
  is_sms_only: boolean;
  evacuation_status: EvacuationStatus;
  notes: string | null;
  welfare_assigned_profile_id: string | null;
  welfare_assigned_at: string | null;
};
export type HouseholdsInsert = ReadonlyMutationShape<
  HouseholdsRow,
  "created_at" | "updated_at",
  "barangay_id" | "household_head" | "purok"
>;
export type HouseholdsUpdate = ReadonlyMutationShape<HouseholdsRow, "created_at" | "updated_at">;

export type HouseholdMembersRow = Timestamped & {
  id: string;
  household_id: string;
  full_name: string;
  age: number | null;
  vulnerability_flags: VulnerabilityFlag[];
  notes: string | null;
};
export type HouseholdMembersInsert = ReadonlyMutationShape<
  HouseholdMembersRow,
  "created_at",
  "household_id" | "full_name"
>;
export type HouseholdMembersUpdate = ReadonlyMutationShape<HouseholdMembersRow, "created_at">;

export type CheckInsRow = NullableGeoPoint & {
  id: string;
  barangay_id: string;
  center_id: string;
  resident_id: string | null;
  household_id: string | null;
  method: CheckInMethod;
  checked_in_at: string;
  notes: string | null;
};
export type CheckInsInsert = ReadonlyMutationShape<
  CheckInsRow,
  "checked_in_at",
  "barangay_id" | "center_id"
>;
export type CheckInsUpdate = ReadonlyMutationShape<CheckInsRow, "checked_in_at">;

export type StatusPingsRow = NullableGeoPoint & {
  id: string;
  barangay_id: string;
  resident_id: string | null;
  household_id: string | null;
  status: PingStatus;
  channel: PingChannel;
  message: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  pinged_at: string;
};
export type StatusPingsInsert = ReadonlyMutationShape<
  StatusPingsRow,
  "pinged_at",
  "barangay_id" | "status"
>;
export type StatusPingsUpdate = ReadonlyMutationShape<StatusPingsRow, "pinged_at">;

export type PushTokensRow = TimestampedUpdated & {
  id: string;
  resident_id: string;
  barangay_id: string;
  token: string;
  platform: PushPlatform | null;
  is_active: boolean;
};
export type PushTokensInsert = ReadonlyMutationShape<
  PushTokensRow,
  "created_at" | "updated_at",
  "resident_id" | "barangay_id" | "token"
>;
export type PushTokensUpdate = ReadonlyMutationShape<PushTokensRow, "created_at" | "updated_at">;

export type AlertsRow = Timestamped & {
  id: string;
  barangay_id: string | null;
  source: AlertSource;
  severity: AlertSeverity;
  hazard_type: string;
  title: string;
  title_filipino: string | null;
  body: string;
  body_filipino: string | null;
  signal_level: string | null;
  recommended_actions: string | null;
  recommended_actions_filipino: string | null;
  source_url: string | null;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
  external_id: string | null;
};
export type AlertsInsert = ReadonlyMutationShape<
  AlertsRow,
  "created_at",
  "source" | "hazard_type" | "title" | "body"
>;
export type AlertsUpdate = ReadonlyMutationShape<AlertsRow, "created_at">;

export type BroadcastsRow = {
  id: string;
  barangay_id: string;
  sent_by: string;
  broadcast_type: BroadcastType;
  message: string;
  message_filipino: string | null;
  target_purok: string | null;
  push_sent_count: number;
  sms_sent_count: number;
  sent_at: string;
};
export type BroadcastsInsert = ReadonlyMutationShape<
  BroadcastsRow,
  "sent_at",
  "barangay_id" | "sent_by" | "message"
>;
export type BroadcastsUpdate = ReadonlyMutationShape<BroadcastsRow, "sent_at">;

export type SmsLogsRow = Timestamped & {
  id: string;
  barangay_id: string;
  household_id: string | null;
  broadcast_id: string | null;
  direction: SmsDirection;
  phone_number: string;
  message: string;
  delivery_status: SmsDeliveryStatus;
  keyword_reply: SmsKeyword | null;
  gateway_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
};
export type SmsLogsInsert = ReadonlyMutationShape<
  SmsLogsRow,
  "created_at",
  "barangay_id" | "direction" | "phone_number" | "message"
>;
export type SmsLogsUpdate = ReadonlyMutationShape<SmsLogsRow, "created_at">;

export type NeedsReportsRow = {
  id: string;
  barangay_id: string;
  center_id: string | null;
  submitted_by: string;
  total_evacuees: number;
  needs_food_packs: number;
  needs_water_liters: number;
  needs_medicine: boolean;
  needs_blankets: number;
  medical_cases: string | null;
  notes: string | null;
  status: NeedsReportStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  submitted_at: string;
  updated_at: string | null;
};
export type NeedsReportsInsert = ReadonlyMutationShape<
  NeedsReportsRow,
  "submitted_at" | "updated_at",
  "barangay_id" | "submitted_by"
>;
export type NeedsReportsUpdate = ReadonlyMutationShape<
  NeedsReportsRow,
  "submitted_at" | "updated_at"
>;

export type IncidentReportsRow = Timestamped & {
  id: string;
  barangay_id: string;
  generated_by: string;
  title_english: string;
  title_filipino: string;
  body_english: string;
  body_filipino: string;
  next_steps_english: string;
  next_steps_filipino: string;
  dashboard_snapshot: Record<string, unknown>;
  generation_source: IncidentReportGenerationSource;
};
export type IncidentReportsInsert = ReadonlyMutationShape<
  IncidentReportsRow,
  "created_at",
  | "barangay_id"
  | "generated_by"
  | "title_english"
  | "title_filipino"
  | "body_english"
  | "body_filipino"
  | "next_steps_english"
  | "next_steps_filipino"
>;
export type IncidentReportsUpdate = ReadonlyMutationShape<IncidentReportsRow, "created_at">;

export type CenterSuppliesRow = {
  center_id: string;
  food_packs: number;
  water_liters: number;
  medicine_units: number;
  blankets: number;
  updated_at: string | null;
  updated_by: string | null;
};
export type CenterSuppliesInsert = Partial<Omit<CenterSuppliesRow, "center_id">> & { center_id: string };
export type CenterSuppliesUpdate = Partial<Omit<CenterSuppliesRow, "center_id">>;

export type MissingPersonStatus = "missing" | "found";

export type MissingPersonsRow = {
  id: string;
  barangay_id: string;
  reported_by: string;
  full_name: string;
  age: number | null;
  last_seen_location: string | null;
  description: string | null;
  status: MissingPersonStatus;
  found_at: string | null;
  found_by: string | null;
  created_at: string;
  updated_at: string | null;
};
export type MissingPersonsInsert = Omit<MissingPersonsRow, "id" | "created_at" | "updated_at" | "found_at" | "found_by" | "status"> & {
  status?: MissingPersonStatus;
};
export type MissingPersonsUpdate = Partial<Omit<MissingPersonsRow, "id" | "barangay_id" | "reported_by" | "created_at">>;

// appended
