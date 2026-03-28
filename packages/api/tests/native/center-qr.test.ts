import { describe, expect, it } from "vitest";

import {
  buildCenterQrShareMessage,
  getCenterQrPreview,
} from "../../../../apps/native/features/dashboard/services/centerQr";

const center = {
  id: "center-1",
  barangay_id: "barangay-1",
  name: "Central School",
  address: "Purok 2",
  latitude: 0,
  longitude: 0,
  capacity: 500,
  is_open: true,
  contact_number: null,
  notes: null,
  qr_code_token: "12345678-1234-1234-1234-1234567890ab",
  current_occupancy: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as const;

describe("center qr helpers", () => {
  it("builds a print-ready token share message", () => {
    const message = buildCenterQrShareMessage(center);

    expect(message).toContain("Agap check-in token for Central School");
    expect(message).toContain("Check-in token: 12345678-1234-1234-1234-1234567890ab");
  });

  it("shortens long token previews", () => {
    expect(getCenterQrPreview(center)).toBe("12345678...567890ab");
  });
});
