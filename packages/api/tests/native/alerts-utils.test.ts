import { describe, expect, it } from "vitest";

import {
  buildAlertShareMessage,
  getAlertCopy,
  getAlertSignalLabel,
  isAlertStale,
} from "../../../../apps/native/features/alerts/utils";

const baseAlert = {
  id: "alert-1",
  barangay_id: "barangay-1",
  source: "manual",
  severity: "warning",
  hazard_type: "Typhoon",
  title: "Storm surge warning",
  title_filipino: "Babala sa daluyong",
  body: "Move away from the shoreline immediately.",
  body_filipino: "Lumayo agad sa baybayin.",
  signal_level: "3",
  recommended_actions: "Evacuate to higher ground.",
  recommended_actions_filipino: "Lumikas sa mas mataas na lugar.",
  source_url: "https://example.com/alert",
  issued_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  expires_at: null,
  is_active: true,
  external_id: null,
  created_at: new Date().toISOString(),
} as const;

describe("alerts utils", () => {
  it("returns filipino content when available", () => {
    expect(getAlertCopy(baseAlert, "filipino")).toEqual({
      title: "Babala sa daluyong",
      body: "Lumayo agad sa baybayin.",
      recommendedActions: "Lumikas sa mas mataas na lugar.",
    });
  });

  it("normalizes signal labels", () => {
    expect(getAlertSignalLabel("3")).toBe("Signal 3");
    expect(getAlertSignalLabel("Signal 4")).toBe("Signal 4");
  });

  it("marks alerts older than 72 hours as stale", () => {
    expect(isAlertStale(new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString())).toBe(true);
    expect(isAlertStale(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())).toBe(false);
  });

  it("builds a share message with source and link", () => {
    const message = buildAlertShareMessage(baseAlert, "english");

    expect(message).toContain("Storm surge warning");
    expect(message).toContain("Signal level: Signal 3");
    expect(message).toContain("Source: Official");
    expect(message).toContain("More info: https://example.com/alert");
  });
});
