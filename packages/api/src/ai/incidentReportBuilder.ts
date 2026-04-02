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

  const bodyEnglish = `CURRENT VERIFIED COUNTS:
• Total households: ${summary.total_households}
• Checked in: ${summary.checked_in_count}
• Marked safe: ${summary.safe_count}
• Need immediate assistance: ${summary.need_help_count}
• Unaccounted: ${summary.unaccounted_count}
• Vulnerable unaccounted: ${summary.vulnerable_unaccounted}

${summary.vulnerable_unaccounted > 0 ? "⚠️ Vulnerable households still unaccounted should be prioritized." : ""}`;

  const bodyFilipino = `KASALUKUYANG BERIPIKADONG BILANG:
• Kabuuang kabahayan: ${summary.total_households}
• Naka-check in: ${summary.checked_in_count}
• Naitalang ligtas: ${summary.safe_count}
• Nangangailangan ng tulong: ${summary.need_help_count}
• Hindi pa natutukoy: ${summary.unaccounted_count}
• Mahihinang hindi natutukoy: ${summary.vulnerable_unaccounted}

${summary.vulnerable_unaccounted > 0 ? "⚠️ Ang mahihinang kabahayan na hindi pa natutukoy ay dapat unahin." : ""}`;

  const nextStepsEnglish = `RECOMMENDED ACTIONS:
1. Dispatch welfare teams to unaccounted and vulnerable households.
2. Sustain supply support for evacuation centers based on current needs reports.
3. Continue barangay-wide status verification and update dashboard counts every cycle.`;

  const nextStepsFilipino = `INIREREKOMENDANG HAKBANG:
1. Magpadala ng welfare teams sa mga hindi pa natutukoy at mahihinang kabahayan.
2. Ipagpatuloy ang suporta ng suplay sa evacuation centers base sa kasalukuyang needs reports.
3. Ipagpatuloy ang barangay-wide status verification at i-update ang dashboard counts sa bawat cycle.`;

  return {
    titleEnglish,
    titleFilipino,
    bodyEnglish,
    bodyFilipino,
    nextStepsEnglish,
    nextStepsFilipino,
  };
}
