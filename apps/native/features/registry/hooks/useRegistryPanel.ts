import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";

export function useRegistryPanel() {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const listQuery = useQuery(
    trpc.households.list.queryOptions(
      {
        barangayId: profile?.barangay_id ?? undefined,
        page: 1,
        pageSize: 40,
      },
      {
        enabled: Boolean(profile?.barangay_id),
      },
    ),
  );

  const searchQuery = useQuery(
    trpc.households.search.queryOptions(
      {
        barangayId: profile?.barangay_id ?? undefined,
        query,
      },
      {
        enabled: Boolean(profile?.barangay_id && query.trim().length >= 2),
      },
    ),
  );

  const updateStatusMutation = useMutation(
    trpc.households.updateStatus.mutationOptions({
      onSuccess: (_, variables) => {
        void listQuery.refetch();
        if (query.trim().length >= 2) {
          void searchQuery.refetch();
        }

        setFeedback(`Household status updated to ${variables.evacuationStatus.replaceAll("_", " ")}.`);
      },
    }),
  );

  const households = useMemo(() => {
    return query.trim().length >= 2 ? searchQuery.data ?? [] : listQuery.data?.items ?? [];
  }, [listQuery.data?.items, query, searchQuery.data]);

  return {
    query,
    setQuery,
    feedback,
    households,
    isLoading: listQuery.isLoading || searchQuery.isFetching,
    updateStatusMutation,
  };
}
