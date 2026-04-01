import { Text } from "react-native";

import { EmptyState, SectionCard } from "@/shared/components/ui";

import { RegistryHouseholdCard } from "./RegistryHouseholdCard";

import type { EvacuationStatus, Household } from "@project-agap/api/supabase";

type Props = {
  households: Household[];
  isLoading: boolean;
  isUpdating: boolean;
  updatingHouseholdId?: string;
  isAssigningWelfare?: boolean;
  assigningWelfareHouseholdId?: string;
  onUpdateStatus: (householdId: string, evacuationStatus: EvacuationStatus) => void;
  onAssignWelfare?: (householdId: string) => void;
};

export function RegistryListCard({
  households,
  isLoading,
  isUpdating,
  updatingHouseholdId,
  isAssigningWelfare,
  assigningWelfareHouseholdId,
  onUpdateStatus,
  onAssignWelfare,
}: Props) {
  return (
    <SectionCard title="Registry list" subtitle="Residents and SMS-only households live in the same accountability surface.">
      {isLoading && !households.length ? (
        <Text className="text-sm text-slate-500">Loading registry data...</Text>
      ) : null}
      {households.length ? (
        households.map((household) => (
          <RegistryHouseholdCard
            key={household.id}
            household={household}
            isUpdating={isUpdating && updatingHouseholdId === household.id}
            isAssigningWelfare={Boolean(isAssigningWelfare && assigningWelfareHouseholdId === household.id)}
            onUpdateStatus={onUpdateStatus}
            onAssignWelfare={onAssignWelfare}
          />
        ))
      ) : (
        <EmptyState
          title="No households found"
          description="When residents finish onboarding or officials register households, they will appear here."
        />
      )}
    </SectionCard>
  );
}
