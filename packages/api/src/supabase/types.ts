export type TableDefinition<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update extends Record<string, unknown>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type FunctionDefinition<
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
  | "unknown"
  | "welfare_check_dispatched"
  | "not_home";

export type WelfareVisitOutcome = "safe" | "need_help" | "not_home" | "dispatch_again";

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
export type IncidentReportGenerationSource = "template_free" | "cached_fallback";
