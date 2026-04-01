import type { Alert } from "@project-agap/api/supabase";

import { ALERT_STALE_HOURS } from "./constants";
import type { AlertCopy, AlertLanguage } from "./types";

export function getAlertTone(severity: string) {
  switch (severity) {
    case "danger":
      return "danger" as const;
    case "warning":
    case "watch":
      return "warning" as const;
    case "success":
      return "success" as const;
    default:
      return "info" as const;
  }
}

export function isAlertStale(issuedAt: string | null | undefined) {
  if (!issuedAt) {
    return false;
  }

  const staleThresholdMs = ALERT_STALE_HOURS * 60 * 60 * 1000;
  return Date.now() - new Date(issuedAt).getTime() > staleThresholdMs;
}

export function getAlertSignalLabel(signalLevel: string | null | undefined) {
  if (!signalLevel?.trim()) {
    return null;
  }

  const normalizedSignalLevel = signalLevel.trim();

  if (/signal/i.test(normalizedSignalLevel)) {
    return normalizedSignalLevel;
  }

  return `Signal ${normalizedSignalLevel}`;
}

export function getAlertSourceLabel(source: Alert["source"]) {
  switch (source) {
    case "manual":
      return "Official";
    case "pagasa":
      return "PAGASA";
    case "phivolcs":
      return "PHIVOLCS";
    default:
      return source.toUpperCase();
  }
}

export function getAlertCopy(alert: Alert, language: AlertLanguage): AlertCopy {
  const isFilipino = language === "filipino";

  return {
    title: isFilipino ? alert.title_filipino || alert.title : alert.title,
    body: isFilipino ? alert.body_filipino || alert.body : alert.body,
    recommendedActions: isFilipino
      ? alert.recommended_actions_filipino || alert.recommended_actions || ""
      : alert.recommended_actions || alert.recommended_actions_filipino || "",
  };
}

export function getAlertPreview(alert: Alert, language: AlertLanguage) {
  const copy = getAlertCopy(alert, language);

  if (copy.body.length <= 180) {
    return copy.body;
  }

  return `${copy.body.slice(0, 177).trimEnd()}...`;
}

export function buildAlertShareMessage(alert: Alert, language: AlertLanguage) {
  const copy = getAlertCopy(alert, language);
  const signalLabel = getAlertSignalLabel(alert.signal_level);

  return [
    copy.title,
    copy.body,
    copy.recommendedActions ? `Recommended actions: ${copy.recommendedActions}` : null,
    signalLabel ? `Signal level: ${signalLabel}` : null,
    `Source: ${getAlertSourceLabel(alert.source)}`,
    alert.source_url ? `More info: ${alert.source_url}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
