export const TOTAL_SIGN_UP_STEPS = 4;

/** Known puroks/sitos per barangay. Extend this map as new barangays are onboarded. */
export const PUROKS_BY_BARANGAY: Record<string, readonly string[]> = {};

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
