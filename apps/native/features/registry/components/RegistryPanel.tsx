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
      description="Search, expand, act."
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
      {/* Summary strip */}
      <View className="mx-6 mt-4 flex-row items-center justify-between">
        <Text className="text-[13px] font-medium text-slate-400">
          {households.length} household{households.length === 1 ? "" : "s"}
          {filter !== "all" ? ` \u00B7 ${filter.replaceAll("_", " ")}` : ""}
        </Text>
        {isRefreshing ? (
          <Text className="text-[11px] font-semibold text-slate-300">Refreshing...</Text>
        ) : null}
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
