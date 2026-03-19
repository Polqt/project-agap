import type { Household } from "@project-agap/api/supabase";

import BottomSheet from "@gorhom/bottom-sheet";
import { memo, useCallback } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/app/empty-state";

const HouseholdResultRow = memo(function HouseholdResultRow({
  item,
  onPress,
}: {
  item: Household;
  onPress: (item: Household) => void;
}) {
  return (
    <Pressable
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
      onPress={() => onPress(item)}
    >
      <Text className="text-base font-semibold text-slate-900">{item.household_head}</Text>
      <Text className="mt-1 text-sm text-slate-600">{`${item.purok} | ${item.address}`}</Text>
    </Pressable>
  );
});

export function CrossPingSheet({
  bottomSheetRef,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searching,
  selectedHousehold,
  onHouseholdPress,
  onSubmitStatus,
}: {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: Household[];
  searching: boolean;
  selectedHousehold: Household | null;
  onHouseholdPress: (item: Household) => void;
  onSubmitStatus: (status: "safe" | "need_help", householdId?: string | null) => void;
}) {
  const renderResult = useCallback(
    ({ item }: { item: Household }) => (
      <HouseholdResultRow item={item} onPress={onHouseholdPress} />
    ),
    [onHouseholdPress],
  );

  return (
    <BottomSheet index={0} ref={bottomSheetRef} snapPoints={["14%", "55%", "78%"]}>
      <View className="flex-1 gap-4 px-5 pb-8">
        <View className="gap-2">
          <Text className="text-lg font-semibold text-slate-950">Household cross-ping</Text>
          <Text className="text-sm leading-6 text-slate-600">
            Search the household registry, choose the household, then confirm their current status.
          </Text>
        </View>

        <TextInput
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900"
          onChangeText={onSearchQueryChange}
          placeholder="Search household head or purok"
          placeholderTextColor="#94A3B8"
          value={searchQuery}
        />

        {searching ? <Text className="text-sm text-slate-500">Searching households...</Text> : null}

        {searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderResult}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            title="Search a household"
            description="Results will appear here after you type at least two characters."
          />
        )}

        {selectedHousehold ? (
          <View className="gap-3 rounded-[24px] bg-slate-950 px-4 py-4">
            <Text className="text-base font-semibold text-white">
              Selected: {selectedHousehold.household_head}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3"
                onPress={() => onSubmitStatus("safe", selectedHousehold.id)}
              >
                <Text className="text-center font-semibold text-white">Mark Safe</Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-3"
                onPress={() => onSubmitStatus("need_help", selectedHousehold.id)}
              >
                <Text className="text-center font-semibold text-white">Need Help</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}
