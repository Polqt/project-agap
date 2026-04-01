import { Text, View } from "react-native";

import { ScreenHeader, SectionCard } from "@/shared/components/ui";

import { RegistryListCard } from "./RegistryListCard";
import { RegistrySearchCard } from "./RegistrySearchCard";
import { useRegistryPanel } from "../hooks/useRegistryPanel";

export function RegistryPanel() {
  const { query, setQuery, feedback, households, isLoading, updateStatusMutation } = useRegistryPanel();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.2 Household registry"
        title="Household registry"
        description="Search the registry, inspect household status, and update accountability markers for your barangay."
      />
      {feedback ? (
        <SectionCard>
          <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
        </SectionCard>
      ) : null}
      <RegistrySearchCard value={query} onChange={setQuery} />
      <RegistryListCard
        households={households}
        isLoading={isLoading}
        isUpdating={updateStatusMutation.isPending}
        updatingHouseholdId={updateStatusMutation.variables?.householdId}
        onUpdateStatus={(householdId, evacuationStatus) => {
          void updateStatusMutation.mutateAsync({ householdId, evacuationStatus });
        }}
      />
    </View>
  );
}
