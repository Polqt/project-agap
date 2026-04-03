import type { DashboardSummary } from "../supabase";

export type BuiltIncidentReport = {
  titleEnglish: string;
  titleFilipino: string;
  bodyEnglish: string;
  bodyFilipino: string;
  nextStepsEnglish: string;
  nextStepsFilipino: string;
};

export async function buildIncidentReportFromSummary(
  summary: DashboardSummary,
): Promise<BuiltIncidentReport> {
  const titleEnglish = "LGU Incident Situation Report";
  const titleFilipino = "Ulat ng Sitwasyon ng Insidente ng LGU";

  const bodyEnglish =
    `Current verified counts: ${summary.total_households} total households, ` +
    `${summary.checked_in_count} checked in, ${summary.safe_count} marked safe, ` +
    `${summary.need_help_count} need immediate assistance, and ${summary.unaccounted_count} remain unaccounted. ` +
    `${summary.vulnerable_unaccounted} vulnerable households are still unaccounted and should be prioritized.`;

  const bodyFilipino =
    `Kasalukuyang beripikadong bilang: ${summary.total_households} kabuuang kabahayan, ` +
    `${summary.checked_in_count} naka-check in, ${summary.safe_count} naitalang ligtas, ` +
    `${summary.need_help_count} ang nangangailangan ng agarang tulong, at ${summary.unaccounted_count} ang hindi pa natutukoy. ` +
    `${summary.vulnerable_unaccounted} mahihinang kabahayan ang hindi pa natutukoy at dapat unahin.`;

  const nextStepsEnglish =
    "Recommended actions: 1) Dispatch welfare teams to unaccounted and vulnerable households. " +
    "2) Sustain supply support for evacuation centers based on current needs reports. " +
    "3) Continue barangay-wide status verification and update dashboard counts every cycle.";

  const nextStepsFilipino =
    "Inirerekomendang susunod na hakbang: 1) Magpadala ng welfare teams sa mga hindi pa natutukoy at mahihinang kabahayan. " +
    "2) Ipagpatuloy ang suporta ng suplay sa evacuation centers base sa kasalukuyang needs reports. " +
    "3) Ipagpatuloy ang barangay-wide status verification at i-update ang dashboard counts sa bawat cycle.";

  return {
    titleEnglish,
    titleFilipino,
    bodyEnglish,
    bodyFilipino,
    nextStepsEnglish,
    nextStepsFilipino,
  };
}
