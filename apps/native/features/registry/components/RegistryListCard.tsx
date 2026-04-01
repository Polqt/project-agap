import { Text } from "react-native";

import { EmptyState, SectionCard } from "@/shared/components/ui";

import { RegistryHouseholdCard } from "./RegistryHouseholdCard";

import type { EvacuationStatus, Household } from "@project-agap/api/supabase";

type Props = {
  households: Household[];
  isLoading: boolean;
  isUpdating: boolean;
  updatingHouseholdId?: string;
  onUpdateStatus: (householdId: string, evacuationStatus: EvacuationStatus) => void;
};

export function RegistryListCard({
  households,
  isLoading,
  isUpdating,
  updatingHouseholdId,
  onUpdateStatus,
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
            onUpdateStatus={onUpdateStatus}
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
