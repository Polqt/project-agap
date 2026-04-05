import type { Household } from "@project-agap/api/supabase";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskScore = {
  score: number;
  level: RiskLevel;
  label: string;
};

/**
 * Computes a 0–100 vulnerability risk score for a household.
 * Used to prioritize welfare outreach during disaster response.
 */
export function computeRiskScore(household: Pick<Household, "vulnerability_flags" | "phone_number" | "evacuation_status" | "total_members">): RiskScore {
  let score = 0;

  // Vulnerability flags: 15 pts each (max 6 flags = 90 pts)
  score += (household.vulnerability_flags?.length ?? 0) * 15;

  // No phone = cannot receive SMS broadcasts
  if (!household.phone_number) score += 20;

  // Unknown or home status = not yet accounted for
  if (household.evacuation_status === "unknown" || household.evacuation_status === "home") {
    score += 15;
  }

  // Large household = more people at risk
  if ((household.total_members ?? 0) > 4) score += 10;

  // need_help ping = highest urgency
  if (household.evacuation_status === "need_help") score += 25;

  score = Math.min(score, 100);

  let level: RiskLevel;
  if (score >= 70) level = "critical";
  else if (score >= 45) level = "high";
  else if (score >= 20) level = "medium";
  else level = "low";

  const labels: Record<RiskLevel, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };

  return { score, level, label: labels[level] };
}

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  critical: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};
