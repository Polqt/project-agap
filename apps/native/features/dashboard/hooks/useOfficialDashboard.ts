import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import {
  getOfflineDashboardSummary,
  getOfflineScope,
  listOfflineEvacuationCenters,
  listOfflineUnaccountedHouseholds,
  listOfflineUnresolvedPings,
  listOfflineWelfareDispatch,
  patchOfflineDashboardSummary,
  patchOfflineEvacuationCenter,
  removeOfflineUnresolvedPing,
  syncOfflineDatasets,
} from "@/services/offlineData";
import { readOfflineSyncTimestamp } from "@/services/offlineDataDb";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";
import { getLatestSyncedTimestamp } from "@/shared/utils/offline-freshness";
import { trpc } from "@/services/trpc";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

import { buildCenterQrShareMessage } from "../services/centerQr";

export function useOfficialDashboard() {
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const signOut = useSignOutRedirect("/(auth)/sign-in");
  const [feedback, setFeedback] = useState<string | null>(null);
  const offlineScope = getOfflineScope(profile);

  const summaryQuery = useQuery({
    queryKey: ["offline", "dashboard-summary", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineDashboardSummary(offlineScope!.scopeId),
  });

  const unresolvedQuery = useQuery({
    queryKey: ["offline", "unresolved-pings", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineUnresolvedPings(offlineScope!.scopeId),
  });

  const centersQuery = useQuery({
    queryKey: ["offline", "centers", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineEvacuationCenters(offlineScope!.scopeId),
  });

  const unaccountedQuery = useQuery({
    queryKey: ["offline", "unaccounted", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineUnaccountedHouseholds(offlineScope!.scopeId),
  });

  const welfareDispatchQuery = useQuery({
    queryKey: ["offline", "welfare-dispatch", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineWelfareDispatch(offlineScope!.scopeId),
  });

  const syncTimestampQuery = useQuery({
    queryKey: ["offline", "dashboard-sync-timestamp", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => {
      if (!offlineScope) {
        return null;
      }

      const timestamps = await Promise.all([
        readOfflineSyncTimestamp(offlineScope.scopeId, "dashboard-summary"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "unresolved-pings"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "evacuation-centers"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "welfare-dispatch"),
      ]);
      return getLatestSyncedTimestamp(...timestamps);
    },
  });

  async function syncDatasets(
    datasets: Parameters<typeof syncOfflineDatasets>[1],
  ) {
    if (!offlineScope) {
      return;
    }

    await syncOfflineDatasets(offlineScope, datasets);
    bumpOfflineDataGeneration();
  }

  const isLoading =
    summaryQuery.isLoading ||
    unresolvedQuery.isLoading ||
    centersQuery.isLoading ||
    unaccountedQuery.isLoading ||
    welfareDispatchQuery.isLoading;

  const resolveMutation = useMutation(
    trpc.statusPings.resolve.mutationOptions({
      onMutate: async ({ pingId }) => {
        if (!offlineScope) {
          return;
        }

        await removeOfflineUnresolvedPing(offlineScope.scopeId, pingId);
        await patchOfflineDashboardSummary(offlineScope.scopeId, (current) =>
          current
            ? {
                ...current,
                need_help_count: Math.max(0, current.need_help_count - 1),
              }
            : null,
        );
        bumpOfflineDataGeneration();
      },
      onSuccess: () => {
        void syncDatasets(["unresolvedPings", "dashboardSummary", "welfareDispatch"]);
      },
      onError: () => {
        void syncDatasets(["unresolvedPings", "dashboardSummary"]);
      },
    }),
  );

  const toggleCenterMutation = useMutation(
    trpc.evacuationCenters.toggleOpen.mutationOptions({
      onMutate: async ({ centerId, isOpen }) => {
        if (!offlineScope) {
          return;
        }

        // Optimistic update: Update offline data immediately
        await patchOfflineEvacuationCenter(offlineScope.scopeId, centerId, { is_open: isOpen });
        bumpOfflineDataGeneration();
        
        // Immediate UI feedback
        setFeedback(isOpen ? "Center opened" : "Center closed");
      },
      onSuccess: () => {
        void syncDatasets(["evacuationCenters"]);
      },
      onError: (_error, { centerId, isOpen }) => {
        // Rollback on error
        if (offlineScope) {
          void patchOfflineEvacuationCenter(offlineScope.scopeId, centerId, { is_open: !isOpen });
          bumpOfflineDataGeneration();
        }
        setFeedback("Center status changed elsewhere. Data refreshed.");
        void syncDatasets(["evacuationCenters"]);
      },
    }),
  );

  const rotateQrMutation = useMutation(
    trpc.evacuationCenters.rotateQrToken.mutationOptions({
      onSuccess: async (center) => {
        if (offlineScope) {
          await patchOfflineEvacuationCenter(offlineScope.scopeId, center.id, {
            qr_code_token: center.qr_code_token,
            updated_at: center.updated_at,
          });
          bumpOfflineDataGeneration();
        }
        void syncDatasets(["evacuationCenters"]);
        setFeedback("Center check-in token rotated.");
      },
      onError: () => {
        void syncDatasets(["evacuationCenters"]);
      },
    }),
  );

  async function copyCenterToken(centerId: string) {
    const center = centersQuery.data?.find((entry) => entry.id === centerId);

    if (!center?.qr_code_token) {
      setFeedback("This center does not have a check-in token yet.");
      return;
    }

    await Clipboard.setStringAsync(center.qr_code_token);
    setFeedback("Center check-in token copied.");
  }

  async function shareCenterToken(centerId: string) {
    const center = centersQuery.data?.find((entry) => entry.id === centerId);

    if (!center) {
      setFeedback("Center details are unavailable right now.");
      return;
    }

    await Share.share({
      title: `${center.name} check-in token`,
      message: buildCenterQrShareMessage(center),
    });
  }

  return {
    signOut,
    feedback,
    isLoading,
    summary: summaryQuery.data ?? undefined,
    unresolvedPings: unresolvedQuery.data ?? [],
    centers: centersQuery.data ?? [],
    unaccountedHouseholds: unaccountedQuery.data ?? [],
    welfareDispatch: welfareDispatchQuery.data ?? [],
    lastSyncedAt: syncTimestampQuery.data ?? null,
    resolveMutation,
    toggleCenterMutation,
    toggleCenter: (centerId: string, isOpen: boolean) =>
      toggleCenterMutation.mutateAsync({
        centerId,
        isOpen,
        expectedUpdatedAt:
          centersQuery.data?.find((center) => center.id === centerId)?.updated_at ?? null,
      }),
    rotateQrMutation,
    copyCenterToken,
    shareCenterToken,
  };
}
