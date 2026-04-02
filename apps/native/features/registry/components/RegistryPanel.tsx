import { Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";
import { SectionCard } from "@/shared/components/ui";

import { RegistryListCard } from "./RegistryListCard";
import { RegistrySearchCard } from "./RegistrySearchCard";
import { useRegistryPanel } from "../hooks/useRegistryPanel";

export function RegistryPanel() {
  const { query, setQuery, feedback, households, isLoading, updateStatusMutation } = useRegistryPanel();

  return (
    <ScreenShell
      eyebrow="5.3.2 Household registry"
      title="Household registry"
      description="Search the registry, inspect household status, and update accountability markers for your barangay."
      feedback={feedback}
      isLoading={isLoading && !households.length}
      loadingLabel="Loading household registry..."
    >
      <SectionCard>
        <Text className="text-xs uppercase tracking-[1px] text-slate-500">
          Search by household head or purok, then update status in one tap.
        </Text>
      </SectionCard>
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
    </ScreenShell>
  );
}
