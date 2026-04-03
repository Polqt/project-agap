import type {
  EvacuationStatus,
  FunctionDefinition,
  PushPlatform,
  VulnerabilityFlag,
} from "./types";

export type DashboardSummaryRpc = FunctionDefinition<
  { p_barangay_id: string },
  {
    total_households: number;
    checked_in_count: number;
    safe_count: number;
    need_help_count: number;
    unaccounted_count: number;
    vulnerable_unaccounted: number;
    sms_replied_count: number;
  }[]
>;

export type NearbyCentersRpc = FunctionDefinition<
  {
    p_lat: number;
    p_lng: number;
    p_barangay_id: string;
    p_radius_km?: number;
  },
  {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity: number;
    current_occupancy: number;
    is_open: boolean;
    contact_number: string | null;
    notes: string | null;
    qr_code_token: string | null;
    distance_km: number;
  }[]
>;

export type CheckinByQrRpc = FunctionDefinition<
  {
    p_qr_token: string;
    p_resident_id: string;
    p_household_id?: string | null;
    p_lat?: number | null;
    p_lng?: number | null;
  },
  {
    success: boolean;
    message: string;
    center_name: string | null;
    center_id: string | null;
  }[]
>;

export type SmsFollowupListRpc = FunctionDefinition<
  {
    p_barangay_id: string;
    p_broadcast_id: string;
    p_minutes_threshold?: number;
  },
  {
    household_id: string;
    household_head: string;
    purok: string;
    phone_number: string | null;
    vulnerability_flags: VulnerabilityFlag[];
    sms_sent_at: string;
    minutes_since_sent: number;
  }[]
>;

export type WelfareDispatchQueueRpc = FunctionDefinition<
  {
    p_barangay_id: string;
  },
  {
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
    created_at: string;
    updated_at: string | null;
    assignee_full_name: string | null;
  }[]
>;

export type ResolveNeedHelpPingRpc = FunctionDefinition<{ p_ping_id: string }, null>;
export type UpsertPushTokenRpc = FunctionDefinition<{ p_token: string; p_platform: PushPlatform }, null>;
