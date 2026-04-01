import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage } from "@/shared/utils/errors";

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

  function openAlertDetail(alertId: string) {
    router.push({ pathname: "/alert-detail", params: { id: alertId } });
  }

  return {
    alerts: alertsQuery.data ?? [],
    isLoading: alertsQuery.isLoading,
    isRefreshing: alertsQuery.isFetching && !alertsQuery.isLoading,
    isError: alertsQuery.isError,
    errorMessage: alertsQuery.error ? getErrorMessage(alertsQuery.error, "Unable to load alerts.") : null,
    refresh: alertsQuery.refetch,
    openAlertDetail,
  };
}
