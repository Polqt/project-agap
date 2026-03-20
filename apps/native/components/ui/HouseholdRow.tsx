import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import type { HouseholdRowProps } from "@/types/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VulnerabilityChips } from "@/components/ui/VulnerabilityChips";

export const HouseholdRow = memo(function HouseholdRow({
  household,
  onPress,
}: HouseholdRowProps) {
  return (
    <Pressable
      className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
      onPress={() => onPress(household.id)}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
          <Text className="text-sm text-slate-600">
            {household.purok} • {household.address}
          </Text>
        </View>
        <StatusBadge status={household.evacuation_status} />
      </View>
      <View className="mt-3 gap-3">
        <Text className="text-sm text-slate-500">{household.phone_number || "No phone listed"}</Text>
        <VulnerabilityChips flags={household.vulnerability_flags} />
      </View>
    </Pressable>
  );
});
