import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function useDashboardSummary(barangayId?: string | null) {
  return useQuery(
    trpc.dashboard.summary.queryOptions(
      { barangayId: barangayId ?? undefined },
      { enabled: Boolean(barangayId) },
    ),
  );
}
