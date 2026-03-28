import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";

export function useOfficialDashboard() {
  const { profile, signOut } = useAuth();

  const summaryQuery = useQuery(
    trpc.dashboard.summary.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const unresolvedQuery = useQuery(
    trpc.statusPings.listUnresolved.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const unaccountedQuery = useQuery(
    trpc.households.getUnaccounted.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const resolveMutation = useMutation(
    trpc.statusPings.resolve.mutationOptions({
      onSuccess: () => {
        void unresolvedQuery.refetch();
        void summaryQuery.refetch();
      },
    }),
  );

  const toggleCenterMutation = useMutation(
    trpc.evacuationCenters.toggleOpen.mutationOptions({
      onSuccess: () => {
        void centersQuery.refetch();
      },
    }),
  );

  return {
    signOut,
    summary: summaryQuery.data,
    unresolvedPings: unresolvedQuery.data ?? [],
    centers: centersQuery.data ?? [],
    unaccountedHouseholds: unaccountedQuery.data ?? [],
    resolveMutation,
    toggleCenterMutation,
  };
}
