import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function useHouseholdList(barangayId?: string | null, pageSize = 100) {
  return useQuery(
    trpc.households.list.queryOptions(
      {
        barangayId: barangayId ?? undefined,
        page: 1,
        pageSize,
      },
      { enabled: Boolean(barangayId) },
    ),
  );
}
