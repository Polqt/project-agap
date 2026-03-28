import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";

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
    openAlertDetail,
  };
}
