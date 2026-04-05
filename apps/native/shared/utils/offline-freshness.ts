export function getLatestSyncedTimestamp(
  ...timestamps: Array<number | null | undefined>
) {
  const syncedValues = timestamps.filter((value): value is number => typeof value === "number");
  return syncedValues.length > 0 ? Math.max(...syncedValues) : null;
}

export function shouldUseStaleCachedRoute(params: {
  hasStaleCachedRoute: boolean;
  fallbackSource: "seeded-route" | "straight-line";
}) {
  return params.hasStaleCachedRoute && params.fallbackSource === "straight-line";
}
