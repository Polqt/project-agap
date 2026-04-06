import type {
  AlertSeverity,
  AlertSource,
  AppRole,
  BroadcastType,
  IncidentReportGenerationSource,
  PingStatus,
  SmsDeliveryStatus,
  SmsDirection,
  SmsKeyword,
  VulnerabilityFlag,
} from "./types";
import type { Table } from "./database-shared";
import type {
  CheckinByQrRpc,
  DashboardSummaryRpc,
  NearbyCentersRpc,
  ResolveNeedHelpPingRpc,
  SmsFollowupListRpc,
  UpsertPushTokenRpc,
  WelfareDispatchQueueRpc,
} from "./database-functions";
import type {
  AlertsInsert,
  AlertsRow,
  AlertsUpdate,
  BarangaysInsert,
  CenterSuppliesInsert,
  CenterSuppliesRow,
  CenterSuppliesUpdate,
  MissingPersonsInsert,
  MissingPersonsRow,
  MissingPersonsUpdate,
  MutationHistoryInsert,
  MutationHistoryRow,
  MutationHistoryUpdate,
  BarangaysRow,
  BarangaysUpdate,
  BroadcastsInsert,
  BroadcastsRow,
  BroadcastsUpdate,
  CheckInsInsert,
  CheckInsRow,
  CheckInsUpdate,
  EvacuationCentersInsert,
  EvacuationCentersRow,
  EvacuationCentersUpdate,
  EvacuationRoutesInsert,
  EvacuationRoutesRow,
  EvacuationRoutesUpdate,
  HouseholdMembersInsert,
  HouseholdMembersRow,
  HouseholdMembersUpdate,
  HouseholdsInsert,
  HouseholdsRow,
  HouseholdsUpdate,
  IncidentReportsInsert,
  IncidentReportsRow,
  IncidentReportsUpdate,
  NeedsReportsInsert,
  NeedsReportsRow,
  NeedsReportsUpdate,
  ProfilesInsert,
  ProfilesRow,
  ProfilesUpdate,
  PushTokensInsert,
  PushTokensRow,
  PushTokensUpdate,
  SmsLogsInsert,
  SmsLogsRow,
  SmsLogsUpdate,
  StatusPingsInsert,
  StatusPingsRow,
  StatusPingsUpdate,
} from "./database-tables";

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfilesRow, ProfilesInsert, ProfilesUpdate>;
      barangays: Table<BarangaysRow, BarangaysInsert, BarangaysUpdate>;
      evacuation_centers: Table<EvacuationCentersRow, EvacuationCentersInsert, EvacuationCentersUpdate>;
      evacuation_routes: Table<EvacuationRoutesRow, EvacuationRoutesInsert, EvacuationRoutesUpdate>;
      households: Table<HouseholdsRow, HouseholdsInsert, HouseholdsUpdate>;
      household_members: Table<HouseholdMembersRow, HouseholdMembersInsert, HouseholdMembersUpdate>;
      check_ins: Table<CheckInsRow, CheckInsInsert, CheckInsUpdate>;
      status_pings: Table<StatusPingsRow, StatusPingsInsert, StatusPingsUpdate>;
      push_tokens: Table<PushTokensRow, PushTokensInsert, PushTokensUpdate>;
      alerts: Table<AlertsRow, AlertsInsert, AlertsUpdate>;
      broadcasts: Table<BroadcastsRow, BroadcastsInsert, BroadcastsUpdate>;
      sms_logs: Table<SmsLogsRow, SmsLogsInsert, SmsLogsUpdate>;
      needs_reports: Table<NeedsReportsRow, NeedsReportsInsert, NeedsReportsUpdate>;
      incident_reports: Table<IncidentReportsRow, IncidentReportsInsert, IncidentReportsUpdate>;
      center_supplies: Table<CenterSuppliesRow, CenterSuppliesInsert, CenterSuppliesUpdate>;
      missing_persons: Table<MissingPersonsRow, MissingPersonsInsert, MissingPersonsUpdate>;
      mutation_history: Table<MutationHistoryRow, MutationHistoryInsert, MutationHistoryUpdate>;
    };
    Views: Record<string, never>;
    Functions: {
      get_dashboard_summary: DashboardSummaryRpc;
      get_unaccounted_households: {
        Args: { p_barangay_id: string };
        Returns: Database["public"]["Tables"]["households"]["Row"][];
      };
      search_households: {
        Args: { p_barangay_id: string; p_query: string };
        Returns: Database["public"]["Tables"]["households"]["Row"][];
      };
        get_nearby_centers: NearbyCentersRpc;
        checkin_by_qr: CheckinByQrRpc;
        resolve_need_help_ping: ResolveNeedHelpPingRpc;
        get_sms_followup_list: SmsFollowupListRpc;
        get_welfare_dispatch_queue: WelfareDispatchQueueRpc;
        upsert_push_token: UpsertPushTokenRpc;
      };
    Enums: {
      app_role: AppRole;
      vulnerability_flag: VulnerabilityFlag;
      ping_status: PingStatus;
      alert_source: AlertSource;
      alert_severity: AlertSeverity;
      broadcast_type: BroadcastType;
      sms_direction: SmsDirection;
      sms_delivery_status: SmsDeliveryStatus;
      sms_keyword: SmsKeyword;
      incident_report_generation_source: IncidentReportGenerationSource;
    };
    CompositeTypes: Record<string, never>;
  };
}
