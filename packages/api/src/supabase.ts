type TableDefinition<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update extends Record<string, unknown>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type FunctionDefinition<
  Args extends Record<string, unknown> | never,
  Returns,
> = {
  Args: Args;
  Returns: Returns;
};

export type AppRole = "resident" | "official";
export type VulnerabilityFlag =
  | "elderly"
  | "pwd"
  | "infant"
  | "pregnant"
  | "solo_parent"
  | "chronic_illness";
export type EvacuationStatus =
  | "home"
  | "evacuating"
  | "checked_in"
  | "safe"
  | "need_help"
  | "unknown";
export type PingStatus = "safe" | "need_help";
export type AlertSource = "pagasa" | "phivolcs" | "ldrrmo" | "manual";
export type AlertSeverity = "info" | "advisory" | "watch" | "warning" | "danger";
export type BroadcastType = "evacuate_now" | "stay_alert" | "all_clear" | "custom";
export type CheckInMethod = "qr" | "manual" | "proxy" | "sms";
export type SmsDirection = "outbound" | "inbound";
export type SmsDeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "replied";
export type SmsKeyword = "LIGTAS" | "TULONG" | "NASAAN" | "SINO" | "unknown";
export type NeedsReportStatus = "pending" | "acknowledged" | "resolved";
export type PushPlatform = "ios" | "android";

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          id: string;
          role: AppRole;
          full_name: string;
          phone_number: string | null;
          barangay_id: string | null;
          purok: string | null;
          is_sms_only: boolean;
          created_at: string;
          updated_at: string | null;
        },
        {
          id: string;
          role?: AppRole;
          full_name?: string;
          phone_number?: string | null;
          barangay_id?: string | null;
          purok?: string | null;
          is_sms_only?: boolean;
          created_at?: string;
          updated_at?: string | null;
        },
        {
          id?: string;
          role?: AppRole;
          full_name?: string;
          phone_number?: string | null;
          barangay_id?: string | null;
          purok?: string | null;
          is_sms_only?: boolean;
          created_at?: string;
          updated_at?: string | null;
        }
      >;
      barangays: TableDefinition<
        {
          id: string;
          name: string;
          municipality: string;
          province: string;
          region: string;
          latitude: number;
          longitude: number;
          alert_level: "normal" | "advisory" | "watch" | "warning" | "danger";
          active_alert_text: string | null;
          total_households: number;
          created_at: string;
          updated_at: string | null;
        },
        {
          id?: string;
          name: string;
          municipality: string;
          province: string;
          region?: string;
          latitude: number;
          longitude: number;
          alert_level?: "normal" | "advisory" | "watch" | "warning" | "danger";
          active_alert_text?: string | null;
          total_households?: number;
          created_at?: string;
          updated_at?: string | null;
        },
        {
          id?: string;
          name?: string;
          municipality?: string;
          province?: string;
          region?: string;
          latitude?: number;
          longitude?: number;
          alert_level?: "normal" | "advisory" | "watch" | "warning" | "danger";
          active_alert_text?: string | null;
          total_households?: number;
          created_at?: string;
          updated_at?: string | null;
        }
      >;
      evacuation_centers: TableDefinition<
        {
          id: string;
          barangay_id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          capacity: number;
          is_open: boolean;
          contact_number: string | null;
          notes: string | null;
          qr_code_token: string | null;
          current_occupancy: number;
          created_at: string;
          updated_at: string | null;
        },
        {
          id?: string;
          barangay_id: string;
          name: string;
          address?: string;
          latitude: number;
          longitude: number;
          capacity?: number;
          is_open?: boolean;
          contact_number?: string | null;
          notes?: string | null;
          qr_code_token?: string | null;
          current_occupancy?: number;
          created_at?: string;
          updated_at?: string | null;
        },
        {
          id?: string;
          barangay_id?: string;
          name?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          capacity?: number;
          is_open?: boolean;
          contact_number?: string | null;
          notes?: string | null;
          qr_code_token?: string | null;
          current_occupancy?: number;
          created_at?: string;
          updated_at?: string | null;
        }
      >;
      evacuation_routes: TableDefinition<
        {
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
          created_at: string;
          updated_at: string | null;
        },
        {
          id?: string;
          barangay_id: string;
          center_id: string;
          name: string;
          purok_origin?: string | null;
          route_geojson: Record<string, unknown>;
          distance_meters?: number | null;
          estimated_walk_minutes?: number | null;
          color_hex?: string;
          is_accessible?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        },
        {
          id?: string;
          barangay_id?: string;
          center_id?: string;
          name?: string;
          purok_origin?: string | null;
          route_geojson?: Record<string, unknown>;
          distance_meters?: number | null;
          estimated_walk_minutes?: number | null;
          color_hex?: string;
          is_accessible?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        }
      >;
      households: TableDefinition<
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
          created_at: string;
          updated_at: string | null;
        },
        {
          id?: string;
          barangay_id: string;
          registered_by?: string | null;
          household_head: string;
          purok: string;
          address?: string;
          phone_number?: string | null;
          total_members?: number;
          vulnerability_flags?: VulnerabilityFlag[];
          is_sms_only?: boolean;
          evacuation_status?: EvacuationStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        },
        {
          id?: string;
          barangay_id?: string;
          registered_by?: string | null;
          household_head?: string;
          purok?: string;
          address?: string;
          phone_number?: string | null;
          total_members?: number;
          vulnerability_flags?: VulnerabilityFlag[];
          is_sms_only?: boolean;
          evacuation_status?: EvacuationStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        }
      >;
      household_members: TableDefinition<
        {
          id: string;
          household_id: string;
          full_name: string;
          age: number | null;
          vulnerability_flags: VulnerabilityFlag[];
          notes: string | null;
          created_at: string;
        },
        {
          id?: string;
          household_id: string;
          full_name: string;
          age?: number | null;
          vulnerability_flags?: VulnerabilityFlag[];
          notes?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          household_id?: string;
          full_name?: string;
          age?: number | null;
          vulnerability_flags?: VulnerabilityFlag[];
          notes?: string | null;
          created_at?: string;
        }
      >;
      check_ins: TableDefinition<
        {
          id: string;
          barangay_id: string;
          center_id: string;
          resident_id: string | null;
          household_id: string | null;
          method: CheckInMethod;
          checked_in_at: string;
          latitude: number | null;
          longitude: number | null;
          notes: string | null;
        },
        {
          id?: string;
          barangay_id: string;
          center_id: string;
          resident_id?: string | null;
          household_id?: string | null;
          method?: CheckInMethod;
          checked_in_at?: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
        },
        {
          id?: string;
          barangay_id?: string;
          center_id?: string;
          resident_id?: string | null;
          household_id?: string | null;
          method?: CheckInMethod;
          checked_in_at?: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
        }
      >;
      status_pings: TableDefinition<
        {
          id: string;
          barangay_id: string;
          resident_id: string | null;
          household_id: string | null;
          status: PingStatus;
          channel: "app" | "sms";
          latitude: number | null;
          longitude: number | null;
          message: string | null;
          is_resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          pinged_at: string;
        },
        {
          id?: string;
          barangay_id: string;
          resident_id?: string | null;
          household_id?: string | null;
          status: PingStatus;
          channel?: "app" | "sms";
          latitude?: number | null;
          longitude?: number | null;
          message?: string | null;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          pinged_at?: string;
        },
        {
          id?: string;
          barangay_id?: string;
          resident_id?: string | null;
          household_id?: string | null;
          status?: PingStatus;
          channel?: "app" | "sms";
          latitude?: number | null;
          longitude?: number | null;
          message?: string | null;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          pinged_at?: string;
        }
      >;
      push_tokens: TableDefinition<
        {
          id: string;
          resident_id: string;
          barangay_id: string;
          token: string;
          platform: PushPlatform | null;
          is_active: boolean;
          created_at: string;
          updated_at: string | null;
        },
        {
          id?: string;
          resident_id: string;
          barangay_id: string;
          token: string;
          platform?: PushPlatform | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        },
        {
          id?: string;
          resident_id?: string;
          barangay_id?: string;
          token?: string;
          platform?: PushPlatform | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        }
      >;
      alerts: TableDefinition<
        {
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
          created_at: string;
        },
        {
          id?: string;
          barangay_id?: string | null;
          source: AlertSource;
          severity?: AlertSeverity;
          hazard_type: string;
          title: string;
          title_filipino?: string | null;
          body: string;
          body_filipino?: string | null;
          signal_level?: string | null;
          recommended_actions?: string | null;
          recommended_actions_filipino?: string | null;
          source_url?: string | null;
          issued_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          external_id?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          barangay_id?: string | null;
          source?: AlertSource;
          severity?: AlertSeverity;
          hazard_type?: string;
          title?: string;
          title_filipino?: string | null;
          body?: string;
          body_filipino?: string | null;
          signal_level?: string | null;
          recommended_actions?: string | null;
          recommended_actions_filipino?: string | null;
          source_url?: string | null;
          issued_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          external_id?: string | null;
          created_at?: string;
        }
      >;
      broadcasts: TableDefinition<
        {
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
        },
        {
          id?: string;
          barangay_id: string;
          sent_by: string;
          broadcast_type?: BroadcastType;
          message: string;
          message_filipino?: string | null;
          target_purok?: string | null;
          push_sent_count?: number;
          sms_sent_count?: number;
          sent_at?: string;
        },
        {
          id?: string;
          barangay_id?: string;
          sent_by?: string;
          broadcast_type?: BroadcastType;
          message?: string;
          message_filipino?: string | null;
          target_purok?: string | null;
          push_sent_count?: number;
          sms_sent_count?: number;
          sent_at?: string;
        }
      >;
      sms_logs: TableDefinition<
        {
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
          created_at: string;
        },
        {
          id?: string;
          barangay_id: string;
          household_id?: string | null;
          broadcast_id?: string | null;
          direction: SmsDirection;
          phone_number: string;
          message: string;
          delivery_status?: SmsDeliveryStatus;
          keyword_reply?: SmsKeyword | null;
          gateway_message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          replied_at?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          barangay_id?: string;
          household_id?: string | null;
          broadcast_id?: string | null;
          direction?: SmsDirection;
          phone_number?: string;
          message?: string;
          delivery_status?: SmsDeliveryStatus;
          keyword_reply?: SmsKeyword | null;
          gateway_message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          replied_at?: string | null;
          created_at?: string;
        }
      >;
      needs_reports: TableDefinition<
        {
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
        },
        {
          id?: string;
          barangay_id: string;
          center_id?: string | null;
          submitted_by: string;
          total_evacuees?: number;
          needs_food_packs?: number;
          needs_water_liters?: number;
          needs_medicine?: boolean;
          needs_blankets?: number;
          medical_cases?: string | null;
          notes?: string | null;
          status?: NeedsReportStatus;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          submitted_at?: string;
          updated_at?: string | null;
        },
        {
          id?: string;
          barangay_id?: string;
          center_id?: string | null;
          submitted_by?: string;
          total_evacuees?: number;
          needs_food_packs?: number;
          needs_water_liters?: number;
          needs_medicine?: boolean;
          needs_blankets?: number;
          medical_cases?: string | null;
          notes?: string | null;
          status?: NeedsReportStatus;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          submitted_at?: string;
          updated_at?: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_dashboard_summary: FunctionDefinition<
        {
          p_barangay_id: string;
        },
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
      get_unaccounted_households: FunctionDefinition<
        {
          p_barangay_id: string;
        },
        Database["public"]["Tables"]["households"]["Row"][]
      >;
      search_households: FunctionDefinition<
        {
          p_barangay_id: string;
          p_query: string;
        },
        Database["public"]["Tables"]["households"]["Row"][]
      >;
      get_nearby_centers: FunctionDefinition<
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
      checkin_by_qr: FunctionDefinition<
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
      resolve_need_help_ping: FunctionDefinition<
        {
          p_ping_id: string;
        },
        null
      >;
      get_sms_followup_list: FunctionDefinition<
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
      upsert_push_token: FunctionDefinition<
        {
          p_token: string;
          p_platform: PushPlatform;
        },
        null
      >;
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
    };
    CompositeTypes: Record<string, never>;
  };
}

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
export type DashboardSummary = RpcResult<"get_dashboard_summary">[number];
export type NearbyCenter = RpcResult<"get_nearby_centers">[number];
export type CheckInByQrResult = RpcResult<"checkin_by_qr">[number];
export type SmsFollowupItem = RpcResult<"get_sms_followup_list">[number];
