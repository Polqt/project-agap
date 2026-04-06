import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/shared/hooks/useAuth";
import {
  getOfflineScope,
  listOfflineAlerts,
  listOfflineBroadcasts,
  listOfflineMissingPersons,
  patchOfflineMissingPerson,
  syncOfflineDatasets,
  upsertOfflineMissingPerson,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

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
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, queueAction } = useOfflineQueue();
  const offlineScope = getOfflineScope(profile);

  async function syncDatasets(
    datasets: Parameters<typeof syncOfflineDatasets>[1],
  ) {
    if (!offlineScope) {
      return;
    }

    await syncOfflineDatasets(offlineScope, datasets);
    bumpOfflineDataGeneration();
  }

  const alertsQuery = useQuery({
    queryKey: ["offline", "alerts", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineAlerts(offlineScope!.scopeId),
  });

  const broadcastsQuery = useQuery({
    queryKey: ["offline", "broadcasts", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineBroadcasts(offlineScope!.scopeId),
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

  const missingPersonsQuery = useQuery({
    queryKey: ["offline", "missing-persons", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineMissingPersons(offlineScope!.scopeId),
  });

  const reportMutation = useMutation(
    trpc.missingPersons.report.mutationOptions({
      onMutate: async (input) => {
        if (!offlineScope) {
          return;
        }

        await upsertOfflineMissingPerson(offlineScope.scopeId, {
          id: `offline-missing-${Date.now()}`,
          barangay_id: offlineScope.barangayId,
          reported_by: offlineScope.profileId,
          full_name: input.fullName,
          age: input.age ?? null,
          last_seen_location: input.lastSeenLocation ?? null,
          description: input.description ?? null,
          status: "missing",
          found_at: null,
          found_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        bumpOfflineDataGeneration();
      },
      onSuccess: async (person) => {
        if (offlineScope) {
          await upsertOfflineMissingPerson(offlineScope.scopeId, person);
        }
        await syncDatasets(["missingPersons"]);
        void queryClient.invalidateQueries({ queryKey: ["trpc", "missingPersons"] });
      },
      onError: (err) => {
        void syncDatasets(["missingPersons"]);
        Alert.alert(t("common.error"), getErrorMessage(err));
      },
    }),
  );

  const markFoundMutation = useMutation(
    trpc.missingPersons.markFound.mutationOptions({
      onMutate: async ({ id }) => {
        if (!offlineScope) {
          return;
        }

        await patchOfflineMissingPerson(offlineScope.scopeId, id, {
          status: "found",
          found_at: new Date().toISOString(),
          found_by: offlineScope.profileId,
          updated_at: new Date().toISOString(),
        });
        bumpOfflineDataGeneration();
      },
      onSuccess: async (person) => {
        if (offlineScope) {
          await upsertOfflineMissingPerson(offlineScope.scopeId, person);
        }
        await syncDatasets(["missingPersons"]);
        void queryClient.invalidateQueries({ queryKey: ["trpc", "missingPersons"] });
      },
      onError: (err) => {
        void syncDatasets(["missingPersons"]);
        Alert.alert("Error", getErrorMessage(err));
      },
    }),
  );

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

  async function reportMissingPerson(input: Parameters<typeof reportMutation.mutateAsync>[0]) {
    if (!isOnline) {
      await queueAction(createQueuedAction("missing-person.report", input, offlineScope));
      Alert.alert(t("common.success"), "Missing-person report queued offline.");
      return;
    }

    try {
      await reportMutation.mutateAsync(input);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("missing-person.report", input, offlineScope));
        Alert.alert(t("common.success"), "Connection dropped. Missing-person report queued.");
        return;
      }

      throw error;
    }
  }

  async function markMissingPersonFound(id: string) {
    const payload = { id };

    if (!isOnline) {
      await queueAction(createQueuedAction("missing-person.mark-found", payload, offlineScope));
      Alert.alert(t("common.success"), "Found status queued offline.");
      return;
    }

    try {
      await markFoundMutation.mutateAsync(payload);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("missing-person.mark-found", payload, offlineScope));
        Alert.alert(t("common.success"), "Connection dropped. Found status queued.");
        return;
      }

      throw error;
    }
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
    reportMissingPerson,
    markMissingPersonFound,
  };
}
