import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

import { listBroadcastsForBarangay } from "@/features/broadcast/services/broadcasts";
import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage } from "@/shared/utils/errors";

import {
  fetchPhilippineEarthquakes,
  fetchGdacsAlerts,
  fetchPagasaBulletin,
  fetchPhCitiesAirQuality,
  fetchPhilippineNews,
  type UsgsEarthquake,
  type GdacsAlert,
  type PagasaBulletin,
  type CityAirQuality,
  type PhNewsArticle,
} from "../services/hazardFeeds";
import { getAlertSignalLabel } from "../utils";

export function useAlertsData(isBalitaTab: boolean) {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery(
    trpc.alerts.listActive.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id), refetchInterval: 60_000 },
    ),
  );

  const broadcastsQuery = useQuery({
    queryKey: ["broadcasts", "resident", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    queryFn: async () => listBroadcastsForBarangay(profile!.barangay_id!),
  });

  const earthquakesQuery = useQuery<UsgsEarthquake[]>({
    queryKey: ["usgs-earthquakes"],
    queryFn: fetchPhilippineEarthquakes,
    refetchInterval: 2 * 60_000,
    staleTime: 90_000,
  });

  const gdacsQuery = useQuery<GdacsAlert[]>({
    queryKey: ["gdacs-alerts"],
    queryFn: fetchGdacsAlerts,
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });

  const bulletinQuery = useQuery<PagasaBulletin | null>({
    queryKey: ["pagasa-bulletin"],
    queryFn: fetchPagasaBulletin,
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });

  const airQualityQuery = useQuery<CityAirQuality[]>({
    queryKey: ["ph-air-quality"],
    queryFn: fetchPhCitiesAirQuality,
    refetchInterval: 15 * 60_000,
    staleTime: 10 * 60_000,
  });

  const newsQuery = useQuery<PhNewsArticle[]>({
    queryKey: ["ph-news"],
    queryFn: fetchPhilippineNews,
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
    enabled: isBalitaTab,
  });

  const missingPersonsQuery = useQuery(
    trpc.missingPersons.list.queryOptions(
      { statusFilter: "missing" },
      { enabled: Boolean(profile?.barangay_id), refetchInterval: 30_000 },
    ),
  );

  const reportMutation = useMutation(
    trpc.missingPersons.report.mutationOptions({
      // Invalidate list on success — modal handles its own close/reset
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["trpc", "missingPersons"] }),
      onError: (err) => Alert.alert(t("common.error"), getErrorMessage(err)),
    }),
  );

  const markFoundMutation = useMutation(
    trpc.missingPersons.markFound.mutationOptions({
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["trpc", "missingPersons"] }),
      onError: (err) => Alert.alert("Error", getErrorMessage(err)),
    }),
  );

  // Highest active typhoon signal across all alerts
  const activeSignal = (alertsQuery.data ?? []).reduce<string | null>((best, alert) => {
    const label = getAlertSignalLabel(alert.signal_level);
    if (!label) return best;
    if (!best) return label;
    const numA = parseInt(best.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(label.replace(/\D/g, ""), 10) || 0;
    return numB > numA ? label : best;
  }, null);

  const isRefreshing =
    (alertsQuery.isFetching && !alertsQuery.isLoading) ||
    (broadcastsQuery.isFetching && !broadcastsQuery.isLoading) ||
    (missingPersonsQuery.isFetching && !missingPersonsQuery.isLoading) ||
    earthquakesQuery.isFetching ||
    gdacsQuery.isFetching ||
    newsQuery.isFetching;

  async function refresh() {
    await Promise.allSettled([
      alertsQuery.refetch(),
      broadcastsQuery.refetch(),
      missingPersonsQuery.refetch(),
      earthquakesQuery.refetch(),
      gdacsQuery.refetch(),
      bulletinQuery.refetch(),
      airQualityQuery.refetch(),
      isBalitaTab ? newsQuery.refetch() : Promise.resolve(),
    ]);
  }

  return {
    alerts: alertsQuery.data ?? [],
    broadcasts: broadcastsQuery.data ?? [],
    missingPersons: missingPersonsQuery.data ?? [],
    earthquakes: earthquakesQuery.data ?? [],
    gdacsAlerts: gdacsQuery.data ?? [],
    bulletin: bulletinQuery.data ?? null,
    airQualityData: airQualityQuery.data ?? [],
    newsArticles: newsQuery.data ?? [],
    newsIsLoading: newsQuery.isLoading,
    activeSignal,
    signalNumber: activeSignal ? activeSignal.replace(/\D/g, "") : null,
    isRefreshing,
    refresh,
    reportMutation,
    markFoundMutation,
  };
}
