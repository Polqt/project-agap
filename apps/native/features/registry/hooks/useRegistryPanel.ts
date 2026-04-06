import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useMemo, useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import {
  getOfflineRegistryHousehold,
  getOfflineScope,
  listOfflineRegistryHouseholds,
  patchOfflineRegistryHousehold,
  syncOfflineDatasets,
  upsertOfflineRegistryHousehold,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { runWithNetworkResilience } from "@/services/networkResilience";
import { trpc } from "@/services/trpc";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

import type { EvacuationStatus, Household } from "@project-agap/api/supabase";

type RegistryFilter = "all" | "vulnerable" | "unknown" | "sms_only";

function shouldInvalidate(queryKey: readonly unknown[], root: string) {
  const first = queryKey[0];

  if (typeof first === "string") {
    return first === root;
  }

  return Array.isArray(first) && first[0] === root;
}

function sortHouseholds(left: Household, right: Household) {
  const vulnerabilityDelta = right.vulnerability_flags.length - left.vulnerability_flags.length;

  if (vulnerabilityDelta !== 0) {
    return vulnerabilityDelta;
  }

  const leftUnknownRank = left.evacuation_status === "unknown" ? 0 : 1;
  const rightUnknownRank = right.evacuation_status === "unknown" ? 0 : 1;

  if (leftUnknownRank !== rightUnknownRank) {
    return leftUnknownRank - rightUnknownRank;
  }

  return left.household_head.localeCompare(right.household_head, "en", { sensitivity: "base" });
}

function filterHouseholds(households: Household[], filter: RegistryFilter) {
  switch (filter) {
    case "vulnerable":
      return households.filter((household) => household.vulnerability_flags.length > 0);
    case "unknown":
      return households.filter((household) => household.evacuation_status === "unknown");
    case "sms_only":
      return households.filter((household) => household.is_sms_only);
    default:
      return households;
  }
}

function matchesQuery(household: Household, query: string) {
  if (!query) {
    return true;
  }

  const value = query.toLowerCase();
  return (
    household.household_head.toLowerCase().includes(value) ||
    household.purok.toLowerCase().includes(value) ||
    household.address.toLowerCase().includes(value) ||
    (household.phone_number ?? "").toLowerCase().includes(value)
  );
}

export function useRegistryPanel() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, isWeakConnection, queueAction } = useOfflineQueue();
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState<RegistryFilter>("all");
  const [expandedHouseholdId, setExpandedHouseholdId] = useState<string | null>(null);
  const offlineScope = getOfflineScope(profile);

  const trimmedQuery = query.trim();

  const listQuery = useQuery({
    queryKey: ["offline", "registry-households", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineRegistryHouseholds(offlineScope!.scopeId),
  });

  const expandedHouseholdQuery = useQuery({
    queryKey: ["offline", "registry-household", offlineScope?.scopeId, expandedHouseholdId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId && expandedHouseholdId),
    queryFn: async () => getOfflineRegistryHousehold(offlineScope!.scopeId, expandedHouseholdId!),
  });

  const households = useMemo(() => {
    const source = (listQuery.data ?? [])
      .filter((household) => matchesQuery(household, trimmedQuery))
      .slice()
      .sort(sortHouseholds);

    return filterHouseholds(source, filter);
  }, [filter, listQuery.data, trimmedQuery]);

  async function syncDatasets(
    datasets: Parameters<typeof syncOfflineDatasets>[1],
  ) {
    if (!offlineScope) {
      return;
    }

    await syncOfflineDatasets(offlineScope, datasets);
    bumpOfflineDataGeneration();
  }

  const updateStatusMutation = useMutation(
    trpc.households.updateStatus.mutationOptions({
      onMutate: async ({ householdId, evacuationStatus }) => {
        if (!offlineScope) {
          return;
        }

        await patchOfflineRegistryHousehold(offlineScope.scopeId, householdId, {
          evacuation_status: evacuationStatus,
          welfare_assigned_at: null,
          welfare_assigned_profile_id: null,
        });
        bumpOfflineDataGeneration();
      },
      onSuccess: async (household, variables) => {
        if (offlineScope) {
          await upsertOfflineRegistryHousehold(offlineScope.scopeId, household);
        }
        await syncDatasets(["registryHouseholds", "dashboardSummary", "unaccountedHouseholds"]);
        setFeedback(`Status updated to ${variables.evacuationStatus.replaceAll("_", " ")}.`);
      },
      onError: () => {
        void syncDatasets(["registryHouseholds", "dashboardSummary", "unaccountedHouseholds"]).catch(
          () => {},
        );
        setFeedback("Registry status changed elsewhere. Data refreshed.");
      },
    }),
  );

  const assignWelfareMutation = useMutation(
    trpc.households.assignWelfareVisit.mutationOptions({
      onMutate: async ({ householdId }) => {
        if (!offlineScope || !profile) {
          return;
        }

        await patchOfflineRegistryHousehold(offlineScope.scopeId, householdId, {
          evacuation_status: "welfare_check_dispatched",
          welfare_assigned_profile_id: profile.id,
          welfare_assigned_at: new Date().toISOString(),
        });
        bumpOfflineDataGeneration();
      },
      onSuccess: async (household) => {
        if (offlineScope) {
          await upsertOfflineRegistryHousehold(offlineScope.scopeId, household);
        }
        await syncDatasets([
          "registryHouseholds",
          "welfareAssignments",
          "welfareDispatch",
          "dashboardSummary",
          "unaccountedHouseholds",
        ]);
        setFeedback("Welfare visit assigned.");
      },
      onError: () => {
        void syncDatasets(["registryHouseholds", "welfareAssignments", "welfareDispatch"]).catch(
          () => {},
        );
        setFeedback("Welfare assignment changed elsewhere. Data refreshed.");
      },
    }),
  );

  function toggleExpandedHousehold(householdId: string) {
    setExpandedHouseholdId((current) => (current === householdId ? null : householdId));
  }

  async function assignWelfare(householdId: string) {
    const expectedUpdatedAt =
      households.find((household) => household.id === householdId)?.updated_at ?? null;
    const queuedAction = createQueuedAction("household.assign-welfare", {
      householdId,
      expectedUpdatedAt,
    }, offlineScope);

    if (!isOnline) {
      await queueAction(queuedAction);
      setFeedback("Welfare visit queued offline.");
      return;
    }

    try {
      await runWithNetworkResilience(
        "Welfare assignment",
        () => assignWelfareMutation.mutateAsync(queuedAction.payload),
        { isWeakConnection },
      );
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(queuedAction);
        setFeedback(
          isWeakConnection
            ? "Weak signal blocked live delivery, so the welfare visit was staged for retry."
            : "Connection dropped. Welfare visit queued for auto-sync.",
        );
        return;
      }

      setFeedback(getErrorMessage(error, "Unable to assign welfare visit."));
    }
  }

  async function updateStatus(householdId: string, evacuationStatus: EvacuationStatus) {
    const expectedUpdatedAt =
      households.find((household) => household.id === householdId)?.updated_at ?? null;
    const queuedAction = createQueuedAction("household.update-status", {
      householdId,
      evacuationStatus,
      expectedUpdatedAt,
    }, offlineScope);

    if (!isOnline) {
      await queueAction(queuedAction);
      setFeedback(`Status queued offline as ${evacuationStatus.replaceAll("_", " ")}.`);
      return;
    }

    try {
      await runWithNetworkResilience(
        "Registry status update",
        () => updateStatusMutation.mutateAsync(queuedAction.payload),
        { isWeakConnection },
      );
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(queuedAction);
        setFeedback(
          isWeakConnection
            ? "Weak signal blocked live delivery, so the registry update was staged for retry."
            : "Connection dropped. Registry update queued for auto-sync.",
        );
        return;
      }

      setFeedback(getErrorMessage(error, "Unable to update registry status."));
    }
  }

  return {
    expandedHousehold: expandedHouseholdQuery.data ?? null,
    expandedHouseholdId,
    feedback,
    filter,
    households,
    isLoading:
      listQuery.isLoading || (Boolean(expandedHouseholdId) && expandedHouseholdQuery.isLoading),
    isRefreshing: listQuery.isFetching || expandedHouseholdQuery.isFetching,
    query,
    assignWelfareMutation,
    setFilter,
    setQuery,
    toggleExpandedHousehold,
    updateStatusMutation,
    assignWelfare,
    updateStatus,
    refreshConflictData: async () => {
      await syncDatasets([
        "registryHouseholds",
        "welfareAssignments",
        "welfareDispatch",
        "dashboardSummary",
        "unaccountedHouseholds",
      ]);
    },
  };
}
