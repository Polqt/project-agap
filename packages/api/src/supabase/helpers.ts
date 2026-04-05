import type { Database } from "./database";

export type TableRow<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Row"];

export type TableInsert<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Insert"];

export type TableUpdate<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Update"];

export type RpcResult<Name extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][Name]["Returns"];

export type Profile = TableRow<"profiles">;

export type ContextProfile = Pick<
  Profile,
  "id" | "role" | "barangay_id" | "full_name" | "phone_number" | "is_sms_only"
>;

export type Barangay = TableRow<"barangays">;
export type EvacuationCenter = TableRow<"evacuation_centers">;
export type EvacuationRoute = TableRow<"evacuation_routes">;
export type Household = TableRow<"households">;
export type HouseholdMember = TableRow<"household_members">;
export type HouseholdWithMembers = Household & {
  household_members: HouseholdMember[];
};
export type CheckIn = TableRow<"check_ins">;
export type StatusPing = TableRow<"status_pings">;
export type Alert = TableRow<"alerts">;
export type Broadcast = TableRow<"broadcasts">;
export type SmsLog = TableRow<"sms_logs">;
export type NeedsReport = TableRow<"needs_reports">;
export type IncidentReport = TableRow<"incident_reports">;
export type CenterSupplies = TableRow<"center_supplies">;
export type MissingPerson = TableRow<"missing_persons">;
export type DashboardSummary = RpcResult<"get_dashboard_summary">[number];
export type NearbyCenter = RpcResult<"get_nearby_centers">[number];
export type CheckInByQrResult = RpcResult<"checkin_by_qr">[number];
export type SmsFollowupItem = RpcResult<"get_sms_followup_list">[number];
export type WelfareDispatchQueueItem = RpcResult<"get_welfare_dispatch_queue">[number];
