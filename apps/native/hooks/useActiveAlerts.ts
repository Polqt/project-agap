import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function useActiveAlerts(barangayId?: string | null) {
  return useQuery(
    trpc.alerts.listActive.queryOptions(
      {
        barangayId: barangayId ?? "",
      },
      { enabled: Boolean(barangayId) },
    ),
  );
}
