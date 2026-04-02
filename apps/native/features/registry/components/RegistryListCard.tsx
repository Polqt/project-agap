import { View } from "react-native";

import { EmptyState } from "@/shared/components/ui";

import { RegistryHouseholdCard } from "./RegistryHouseholdCard";

import type { EvacuationStatus, Household, HouseholdWithMembers } from "@project-agap/api/supabase";

type Props = {
  expandedHousehold: HouseholdWithMembers | null;
  expandedHouseholdId: string | null;
  households: Household[];
  isAssigningWelfare: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  onAssignWelfare: (householdId: string) => void;
  onToggleHousehold: (householdId: string) => void;
  onUpdateStatus: (householdId: string, evacuationStatus: EvacuationStatus) => void;
};

export function RegistryListCard({
  expandedHousehold,
  expandedHouseholdId,
  households,
  isAssigningWelfare,
  isLoading,
  isUpdating,
  onAssignWelfare,
  onToggleHousehold,
  onUpdateStatus,
}: Props) {
  if (!households.length && !isLoading) {
    return (
      <View className="mx-5 mt-5">
        <EmptyState
          title="No households found"
          description="Try another search or switch filters to widen the registry list."
        />
      </View>
    );
  }

  return (
    <View className="mx-5 mt-5 mb-8 gap-3">
      {households.map((household) => (
        <RegistryHouseholdCard
          key={household.id}
          expandedHousehold={expandedHouseholdId === household.id ? expandedHousehold : null}
          household={household}
          isAssigningWelfare={isAssigningWelfare && expandedHouseholdId === household.id}
          isExpanded={expandedHouseholdId === household.id}
          isUpdating={isUpdating && expandedHouseholdId === household.id}
          onAssignWelfare={onAssignWelfare}
          onToggle={onToggleHousehold}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </View>
  );
}
