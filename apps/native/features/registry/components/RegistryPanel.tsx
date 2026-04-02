import { Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";

import { RegistryListCard } from "./RegistryListCard";
import { RegistrySearchCard } from "./RegistrySearchCard";
import { useRegistryPanel } from "../hooks/useRegistryPanel";

export function RegistryPanel() {
  const {
    expandedHousehold,
    expandedHouseholdId,
    feedback,
    filter,
    households,
    isLoading,
    isRefreshing,
    query,
    assignWelfareMutation,
    setFilter,
    setQuery,
    toggleExpandedHousehold,
    updateStatusMutation,
    assignWelfare,
    updateStatus,
  } = useRegistryPanel();

  return (
    <ScreenShell
      title="Registry"
      description="Search first, expand inline, act fast."
      feedback={feedback}
      topContent={
        <RegistrySearchCard
          activeFilter={filter}
          value={query}
          onChange={setQuery}
          onSelectFilter={setFilter}
        />
      }
    >
      <View className="mx-5 mt-5 rounded-[28px] bg-[#eef2ff] px-4 py-4">
        <Text className="text-sm font-semibold text-slate-950">
          {households.length} household{households.length === 1 ? "" : "s"} in view
        </Text>
        <Text className="mt-1 text-sm leading-6 text-slate-600">
          Sorted vulnerability-first, then unknown status so the riskiest households stay near the top.
        </Text>
        {isRefreshing ? <Text className="mt-2 text-xs font-semibold text-slate-500">Refreshing registry...</Text> : null}
      </View>

      <RegistryListCard
        expandedHousehold={expandedHousehold}
        expandedHouseholdId={expandedHouseholdId}
        households={households}
        isAssigningWelfare={assignWelfareMutation.isPending}
        isLoading={isLoading}
        isUpdating={updateStatusMutation.isPending}
        onAssignWelfare={(householdId) => {
          void assignWelfare(householdId);
        }}
        onToggleHousehold={toggleExpandedHousehold}
        onUpdateStatus={(householdId, evacuationStatus) => {
          void updateStatus(householdId, evacuationStatus);
        }}
      />
    </ScreenShell>
  );
}
