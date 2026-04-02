import { Pressable, Text, View } from "react-native";

import { AppButton, EmptyState, Pill, SectionCard, TextField } from "@/shared/components/ui";

import type { Household } from "@project-agap/api/supabase";

type Props = {
  searchValue: string;
  onChangeSearch: (value: string) => void;
  households: Household[];
  selectedHouseholdId: string | null;
  onSelectHousehold: (householdId: string) => void;
  selectedHousehold: Household | null;
  note: string;
  onChangeNote: (value: string) => void;
  onSubmitSafe: () => void;
  onSubmitNeedHelp: () => void;
  isSearching: boolean;
  isSubmittingSafe: boolean;
  isSubmittingNeedHelp: boolean;
  feedback: string | null;
};

export function ProxyPingCard({
  searchValue,
  onChangeSearch,
  households,
  selectedHouseholdId,
  onSelectHousehold,
  selectedHousehold,
  note,
  onChangeNote,
  onSubmitSafe,
  onSubmitNeedHelp,
  isSearching,
  isSubmittingSafe,
  isSubmittingNeedHelp,
  feedback,
}: Props) {
  const hasSearch = searchValue.trim().length >= 2;

  return (
    <SectionCard
      title="Cross-ping (Proxy)"
      subtitle="Search the household registry and send a status on behalf of another household."
      right={<Pill label="Resident / Tanod" tone="info" />}
    >
      <View className="gap-4">
        <TextField
          label="Search household"
          value={searchValue}
          onChangeText={onChangeSearch}
          placeholder="Household head, purok, or address"
          helperText="Type at least two characters to search the registry."
        />

        <View className="gap-3">
          {isSearching ? <Text className="text-sm text-slate-500">Searching households...</Text> : null}

          {!hasSearch ? (
            <EmptyState
              title="Start your search"
              description="Search by household head, purok, or address to find the family you are assisting."
            />
          ) : null}

          {hasSearch && !isSearching && !households.length ? (
            <EmptyState
              title="No households found"
              description="Try a different household head name, purok, or address keyword."
            />
          ) : null}

          {households.map((household) => (
            <Pressable
              key={household.id}
              onPress={() => onSelectHousehold(household.id)}
              className={`rounded-[24px] border px-4 py-4 ${
                selectedHouseholdId === household.id
                  ? "border-cyan-500 bg-cyan-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {household.purok} | {household.address}
                  </Text>
                </View>
                {selectedHouseholdId === household.id ? (
                  <Pill label="Selected" tone="info" />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>

        {selectedHousehold ? (
          <View className="gap-4 rounded-[28px] border border-cyan-200 bg-cyan-50 p-4">
            <View className="gap-2">
              <Pill label="Active Household" tone="info" />
              <Text className="text-base font-semibold text-slate-950">
                Reporting for {selectedHousehold.household_head}
              </Text>
              <Text className="text-sm leading-6 text-slate-500">
                {selectedHousehold.purok} | {selectedHousehold.address}
              </Text>
            </View>

            <TextField
              label="Optional note"
              value={note}
              onChangeText={onChangeNote}
              placeholder="Example: Neighbor says they are safe but have low battery."
              multiline
            />

            <View className="gap-3">
              <AppButton
                label="Mark household as safe"
                onPress={onSubmitSafe}
                loading={isSubmittingSafe}
                variant="primary"
              />
              <AppButton
                label="Mark household as needing help"
                onPress={onSubmitNeedHelp}
                loading={isSubmittingNeedHelp}
                variant="danger"
              />
            </View>
          </View>
        ) : null}

        {feedback ? (
          <View className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}
