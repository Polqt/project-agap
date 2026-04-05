import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useRouter } from "expo-router";

import { useAuth } from "@/shared/hooks/useAuth";
import { getOfflineScope, listOfflineAlerts, listOfflineBroadcasts } from "@/services/offlineData";
import { getErrorMessage } from "@/shared/utils/errors";
import { offlineDataStore } from "@/stores/offline-data-store";

export function useAlertsFeed() {
  const router = useRouter();
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const offlineScope = getOfflineScope(profile);

  const alertsQuery = useQuery({
    queryKey: ["offline", "alerts-feed", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineAlerts(offlineScope!.scopeId),
  });

  const broadcastsQuery = useQuery({
    queryKey: ["offline", "alerts-broadcasts", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineBroadcasts(offlineScope!.scopeId),
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
