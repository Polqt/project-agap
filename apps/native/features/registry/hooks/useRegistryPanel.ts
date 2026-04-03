import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";

import type { EvacuationStatus, Household } from "@project-agap/api/supabase";
import { getRegistryHouseholdDetail, listRegistryHouseholds } from "../services/registry";

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
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState<RegistryFilter>("all");
  const [expandedHouseholdId, setExpandedHouseholdId] = useState<string | null>(null);

  const trimmedQuery = query.trim();

  const listQuery = useQuery({
    queryKey: ["households", "registry", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    queryFn: async () => listRegistryHouseholds(profile!.barangay_id!),
  });

  const expandedHouseholdQuery = useQuery({
    queryKey: ["households", "detail", expandedHouseholdId],
    enabled: Boolean(profile?.barangay_id && expandedHouseholdId),
    queryFn: async () => getRegistryHouseholdDetail(expandedHouseholdId!, profile!.barangay_id!),
  });

  const households = useMemo(() => {
    const source = (listQuery.data ?? [])
      .filter((household) => matchesQuery(household, trimmedQuery))
      .slice()
      .sort(sortHouseholds);

    return filterHouseholds(source, filter);
  }, [filter, listQuery.data, trimmedQuery]);

  async function invalidateRegistry() {
    await Promise.all([
      queryClient.invalidateQueries({
        predicate: (queryState) => shouldInvalidate(queryState.queryKey, "households"),
      }),
      queryClient.invalidateQueries({
        predicate: (queryState) => shouldInvalidate(queryState.queryKey, "dashboard"),
      }),
    ]);
  }

  const updateStatusMutation = useMutation(
    trpc.households.updateStatus.mutationOptions({
      onSuccess: async (_, variables) => {
        await invalidateRegistry();
        setFeedback(`Status updated to ${variables.evacuationStatus.replaceAll("_", " ")}.`);
      },
    }),
  );

  const assignWelfareMutation = useMutation(
    trpc.households.assignWelfareVisit.mutationOptions({
      onSuccess: async () => {
        await invalidateRegistry();
        setFeedback("Welfare visit assigned.");
      },
    }),
  );

  function toggleExpandedHousehold(householdId: string) {
    setExpandedHouseholdId((current) => (current === householdId ? null : householdId));
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
    assignWelfare: (householdId: string) => assignWelfareMutation.mutateAsync({ householdId }),
    updateStatus: (householdId: string, evacuationStatus: EvacuationStatus) =>
      updateStatusMutation.mutateAsync({ householdId, evacuationStatus }),
  };
}
