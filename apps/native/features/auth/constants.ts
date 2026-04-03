export const TOTAL_SIGN_UP_STEPS = 4;

export const BANAGO_PUROKS = ["Barangay Proper", "Sibucao", "San Patricio"] as const;

/** Pilot barangay ID — keep in sync with packages/db seed. */
const PILOT_BARANGAY_BANAGO_ID = "c0ffee00-baaa-4aaa-8aaa-0000bac0d001";

/** Known puroks/sitos per barangay. Extend this map as new barangays are onboarded. */
export const PUROKS_BY_BARANGAY: Record<string, readonly string[]> = {
  [PILOT_BARANGAY_BANAGO_ID]: BANAGO_PUROKS,
};

export function getPuroksForBarangay(barangayId: string): readonly string[] {
  return PUROKS_BY_BARANGAY[barangayId] ?? [];
}

export const VULNERABILITY_LABELS: Record<string, string> = {
  elderly: "Senior (60+)",
  infant: "Minor (<18)",
  pwd: "PWD",
  pregnant: "Pregnant",
  solo_parent: "Solo parent",
  chronic_illness: "Chronic illness",
};
