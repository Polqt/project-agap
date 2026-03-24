import type { Household } from "@project-agap/api/supabase";

import { FlashList } from "@shopify/flash-list";
import { memo, useCallback } from "react";
import { Text, View } from "react-native";

import { HouseholdRow } from "@/components/ui/HouseholdRow";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/app/empty-state";

const HouseholdRowMemo = memo(HouseholdRow);

export function HouseholdList({
  households,
  isLoading,
  title = "Household Registry",
  scrollEnabled = true,
}: {
  households: Household[];
  isLoading: boolean;
  title?: string;
  scrollEnabled?: boolean;
}) {
  const handleRowPress = useCallback((_id: string) => {}, []);

  return (
    <View className="gap-3">
      <Text className="text-xl font-semibold text-slate-950">{title}</Text>
      {isLoading ? (
        <LoadingSkeleton className="h-24 w-full" lines={3} />
      ) : households.length > 0 ? (
        <FlashList
          data={households}
          renderItem={({ item }) => <HouseholdRowMemo household={item} onPress={handleRowPress} />}
          keyExtractor={(item) => item.id}
          getItemType={(item) => (item.vulnerability_flags.length > 0 ? "vulnerable" : "normal")}
          scrollEnabled={scrollEnabled}
        />
      ) : (
        <EmptyState
          title="No households yet"
          description="Households will appear here once residents register."
        />
      )}
    </View>
  );
}
