import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage } from "@/shared/utils/errors";

import { listBroadcastsForBarangay } from "@/features/broadcast/services/broadcasts";

export function useAlertsFeed() {
  const router = useRouter();
  const { profile } = useAuth();

  const alertsQuery = useQuery(
    trpc.alerts.listActive.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const broadcastsQuery = useQuery({
    queryKey: ["broadcasts", "resident", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    queryFn: async () => listBroadcastsForBarangay(profile!.barangay_id!),
  });

  function openAlertDetail(alertId: string) {
    router.push({ pathname: "/alert-detail", params: { id: alertId } });
  }

  return {
    alerts: alertsQuery.data ?? [],
    broadcasts: broadcastsQuery.data ?? [],
    isLoading: alertsQuery.isLoading && broadcastsQuery.isLoading,
    isRefreshing:
      (alertsQuery.isFetching && !alertsQuery.isLoading) ||
      (broadcastsQuery.isFetching && !broadcastsQuery.isLoading),
    isAlertError: alertsQuery.isError,
    alertErrorMessage: alertsQuery.error
      ? getErrorMessage(alertsQuery.error, "Unable to load alerts.")
      : null,
    isBroadcastError: broadcastsQuery.isError,
    broadcastErrorMessage: broadcastsQuery.error
      ? getErrorMessage(broadcastsQuery.error, "Unable to load broadcasts.")
      : null,
    refresh: async () => {
      await Promise.allSettled([alertsQuery.refetch(), broadcastsQuery.refetch()]);
    },
    openAlertDetail,
  };
}
