import type { NeedsSummary } from "@project-agap/api/ai/needsSummaryBuilder";

export function getNeedsSummaryText(
  summary: NeedsSummary,
  language: "english" | "filipino",
): string {
  if (language === "filipino") {
    return [summary.titleFilipino, "", summary.bodyFilipino].join("\n");
  }
  return [summary.titleEnglish, "", summary.bodyEnglish].join("\n");
}
