import type { IncidentReport } from "@project-agap/api/supabase";

import type { IncidentReportLanguage } from "../types";

export function getIncidentReportText(report: IncidentReport, language: IncidentReportLanguage) {
  if (language === "filipino") {
    return [report.title_filipino, "", report.body_filipino, "", report.next_steps_filipino].join("\n");
  }

  return [report.title_english, "", report.body_english, "", report.next_steps_english].join("\n");
}
