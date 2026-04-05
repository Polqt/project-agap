import Anthropic from "@anthropic-ai/sdk";

import { env } from "@project-agap/env/server";

import type { Alert, DashboardSummary, NeedsReport } from "../supabase";

export type BuiltIncidentReport = {
  titleEnglish: string;
  titleFilipino: string;
  bodyEnglish: string;
  bodyFilipino: string;
  nextStepsEnglish: string;
  nextStepsFilipino: string;
};

export type IncidentReportContext = {
  barangayName: string;
  summary: DashboardSummary;
  activeAlerts: Array<
    Pick<
      Alert,
      "source" | "severity" | "hazard_type" | "title" | "body" | "signal_level" | "issued_at"
    >
  >;
  pendingNeeds: Array<
    Pick<
      NeedsReport,
      | "center_id"
      | "total_evacuees"
      | "needs_food_packs"
      | "needs_water_liters"
      | "needs_medicine"
      | "needs_blankets"
      | "medical_cases"
      | "status"
      | "submitted_at"
    >
  >;
};

const SYSTEM_PROMPT = `You are an AI assistant for Philippine barangay officials during disaster response.
Generate a bilingual (English + Filipino) incident situation report based on dashboard data, active alerts, and evacuation-center needs.

Respond ONLY with valid JSON matching this exact structure:
{
  "titleEnglish": "...",
  "titleFilipino": "...",
  "bodyEnglish": "...",
  "bodyFilipino": "...",
  "nextStepsEnglish": "...",
  "nextStepsFilipino": "..."
}

Guidelines:
- Keep the tone operational, factual, and concise.
- Mention concrete verified counts.
- Highlight urgent risks, unaccounted households, and unmet needs.
- Filipino text should be natural Tagalog, not word-for-word translation.
- Keep each field under 1500 characters.
- Use plain ASCII bullets like "-" when needed.`;

function buildUserPrompt(context: IncidentReportContext): string {
  return `Generate an incident situation report for ${context.barangayName}.

Dashboard summary:
${JSON.stringify(context.summary, null, 2)}

Active alerts:
${JSON.stringify(context.activeAlerts, null, 2)}

Pending needs reports:
${JSON.stringify(context.pendingNeeds, null, 2)}

Current date/time: ${new Date().toISOString()}`;
}

function buildTemplateFallback(summary: DashboardSummary): BuiltIncidentReport {
  return {
    titleEnglish: "LGU Incident Situation Report",
    titleFilipino: "Ulat ng Sitwasyon ng Insidente ng LGU",
    bodyEnglish: `CURRENT VERIFIED COUNTS:
- Total households: ${summary.total_households}
- Checked in: ${summary.checked_in_count}
- Marked safe: ${summary.safe_count}
- Need immediate assistance: ${summary.need_help_count}
- Unaccounted: ${summary.unaccounted_count}
- Vulnerable unaccounted: ${summary.vulnerable_unaccounted}
${summary.vulnerable_unaccounted > 0 ? "\nPriority: vulnerable households that remain unaccounted should be checked first." : ""}`,
    bodyFilipino: `KASALUKUYANG BERIPIKADONG BILANG:
- Kabuuang kabahayan: ${summary.total_households}
- Naka-check in: ${summary.checked_in_count}
- Naitalang ligtas: ${summary.safe_count}
- Nangangailangan ng tulong: ${summary.need_help_count}
- Hindi pa natutukoy: ${summary.unaccounted_count}
- Mahihinang hindi natutukoy: ${summary.vulnerable_unaccounted}
${summary.vulnerable_unaccounted > 0 ? "\nPrayoridad: unahin ang mahihinang kabahayang hindi pa natutukoy." : ""}`,
    nextStepsEnglish: `RECOMMENDED ACTIONS:
1. Dispatch welfare teams to unaccounted and vulnerable households.
2. Sustain supply support for evacuation centers based on current needs reports.
3. Continue barangay-wide status verification and update dashboard counts every cycle.`,
    nextStepsFilipino: `INIREREKOMENDANG HAKBANG:
1. Magpadala ng welfare teams sa mga hindi pa natutukoy at mahihinang kabahayan.
2. Ipagpatuloy ang suporta ng suplay sa evacuation centers base sa kasalukuyang needs reports.
3. Ipagpatuloy ang barangay-wide status verification at i-update ang dashboard counts sa bawat cycle.`,
  };
}

function isBuiltIncidentReport(value: unknown): value is BuiltIncidentReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.titleEnglish === "string" &&
    typeof candidate.titleFilipino === "string" &&
    typeof candidate.bodyEnglish === "string" &&
    typeof candidate.bodyFilipino === "string" &&
    typeof candidate.nextStepsEnglish === "string" &&
    typeof candidate.nextStepsFilipino === "string"
  );
}

function parseIncidentReportJson(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as unknown;
    return isBuiltIncidentReport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function buildIncidentReportFromContext(
  context: IncidentReportContext,
): Promise<BuiltIncidentReport> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(context) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic incident generation returned no text content.");
  }

  const parsed = parseIncidentReportJson(textBlock.text);

  if (!parsed) {
    throw new Error("Anthropic incident generation returned invalid JSON.");
  }

  return parsed;
}

export async function buildIncidentReportFromSummary(
  summary: DashboardSummary,
): Promise<BuiltIncidentReport> {
  return buildTemplateFallback(summary);
}
