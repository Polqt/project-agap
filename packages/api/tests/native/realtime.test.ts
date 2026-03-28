import { describe, expect, it } from "vitest";

import {
  getRealtimeAlertNotification,
  matchesRealtimeBarangayScope,
  shouldNotifyResidentAlert,
} from "../../../../apps/native/services/realtime";

describe("realtime helpers", () => {
  it("matches barangay-scoped alerts including national alerts", () => {
    expect(
      matchesRealtimeBarangayScope("alerts", "barangay-1", {
        eventType: "INSERT",
        new: { barangay_id: null },
        old: {},
      }),
    ).toBe(true);

    expect(
      matchesRealtimeBarangayScope("alerts", "barangay-1", {
        eventType: "INSERT",
        new: { barangay_id: "barangay-2" },
        old: {},
      }),
    ).toBe(false);
  });

  it("only notifies residents for active alert changes", () => {
    expect(
      shouldNotifyResidentAlert({
        eventType: "INSERT",
        new: { is_active: true },
        old: {},
      }),
    ).toBe(true);

    expect(
      shouldNotifyResidentAlert({
        eventType: "DELETE",
        new: { is_active: true },
        old: {},
      }),
    ).toBe(false);
  });

  it("builds a fallback notification payload", () => {
    expect(
      getRealtimeAlertNotification({
        eventType: "INSERT",
        new: { title: "Flood warning", body: "Move to higher ground." },
        old: {},
      }),
    ).toEqual({
      title: "Flood warning",
      body: "Move to higher ground.",
    });
  });
});
