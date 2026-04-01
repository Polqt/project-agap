import { Pressable, Text, View } from "react-native";

import { EmptyState, SectionCard, TextField } from "@/shared/components/ui";

import type { Household } from "@project-agap/api/supabase";

type Props = {
  searchValue: string;
  onChangeSearch: (value: string) => void;
  households: Household[];
  selectedHouseholdId: string | null;
  onSelectHousehold: (householdId: string) => void;
  isLoading: boolean;
};

export function ProxyHouseholdPickerCard({
  searchValue,
  onChangeSearch,
  households,
  selectedHouseholdId,
  onSelectHousehold,
  isLoading,
}: Props) {
  const hasSearch = searchValue.trim().length >= 2;

  return (
    <SectionCard
      title="Proxy household"
      subtitle="Search the barangay registry and choose the household you are checking in for."
    >
      <TextField
        label="Search household"
        value={searchValue}
        onChangeText={onChangeSearch}
        placeholder="Household head, purok, or address"
        helperText="Type at least two characters to search the registry."
      />

      <View className="mt-4 gap-3">
        {isLoading ? <Text className="text-sm text-slate-500">Searching households...</Text> : null}

        {!hasSearch ? (
          <EmptyState
            title="Start your search"
            description="Search by household head, purok, or address to find the family you are assisting."
          />
        ) : null}

        {hasSearch && !isLoading && !households.length ? (
          <EmptyState
            title="No households found"
            description="Try a different household head name, purok, or address keyword."
          />
        ) : null}

        {households.map((household) => (
          <Pressable
            key={household.id}
            onPress={() => onSelectHousehold(household.id)}
            className={`rounded-2xl border px-4 py-4 ${selectedHouseholdId === household.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
          >
            <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
            <Text className="mt-1 text-sm text-slate-500">
              {household.purok} | {household.address}
            </Text>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}
