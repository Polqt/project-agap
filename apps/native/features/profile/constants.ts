import type { EvacuationStatus, VulnerabilityFlag } from "@project-agap/api/supabase/types";

export const vulnerabilityFlagMeta: Record<
  VulnerabilityFlag,
  {
    label: string;
    description: string;
  }
> = {
  elderly: {
    label: "Elderly",
    description: "Senior household members",
  },
  pwd: {
    label: "PWD",
    description: "Persons with disabilities",
  },
  infant: {
    label: "Infant",
    description: "Babies and toddlers",
  },
  pregnant: {
    label: "Pregnant",
    description: "Expectant mothers",
  },
  solo_parent: {
    label: "Solo parent",
    description: "Single-parent support needs",
  },
  chronic_illness: {
    label: "Chronic illness",
    description: "Long-term medical conditions",
  },
};

export const evacuationStatusMeta: Record<
  EvacuationStatus,
  {
    label: string;
    tone: "neutral" | "info" | "success" | "warning" | "danger";
  }
> = {
  home: { label: "At home", tone: "neutral" },
  evacuating: { label: "Evacuating", tone: "warning" },
  checked_in: { label: "Checked in", tone: "info" },
  safe: { label: "Safe", tone: "success" },
  need_help: { label: "Need help", tone: "danger" },
  unknown: { label: "Unknown", tone: "warning" },
  welfare_check_dispatched: { label: "Welfare check", tone: "warning" },
  not_home: { label: "Not home", tone: "neutral" },
};
