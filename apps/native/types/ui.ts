import type {
  Alert,
  EvacuationStatus,
  Household,
  VulnerabilityFlag,
} from "@project-agap/api/supabase";

export type StatusBadgeProps = {
  status: EvacuationStatus | null | undefined;
};

export type VulnerabilityChipsProps = {
  flags: VulnerabilityFlag[];
  tone?: "default" | "danger";
};

export type AlertBannerProps = {
  alert: Alert | null;
};

export type HouseholdRowProps = {
  household: Household;
  onPress: (id: string) => void;
};
