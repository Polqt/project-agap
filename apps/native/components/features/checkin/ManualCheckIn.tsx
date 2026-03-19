import type { EvacuationCenter } from "@project-agap/api/supabase";

import { memo, useCallback } from "react";
import { FlatList, Pressable, Text } from "react-native";

const ManualCenterRow = memo(function ManualCenterRow({
  item,
  isSelected,
  onPress,
}: {
  item: EvacuationCenter;
  isSelected: boolean;
  onPress: (item: EvacuationCenter) => void;
}) {
  return (
    <Pressable
      className={`mb-3 rounded-2xl border px-4 py-4 ${
        isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
      }`}
      onPress={() => onPress(item)}
    >
      <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
      <Text className="mt-1 text-sm text-slate-600">{item.address}</Text>
    </Pressable>
  );
});

export function ManualCheckIn({
  centers,
  selectedCenterId,
  onSelectCenter,
}: {
  centers: EvacuationCenter[];
  selectedCenterId: string | null;
  onSelectCenter: (centerId: string) => void;
}) {
  const renderCenter = useCallback(
    ({ item }: { item: EvacuationCenter }) => (
      <ManualCenterRow
        isSelected={selectedCenterId === item.id}
        item={item}
        onPress={(center) => onSelectCenter(center.id)}
      />
    ),
    [onSelectCenter, selectedCenterId],
  );

  return (
    <FlatList
      data={centers}
      keyExtractor={(item) => item.id}
      renderItem={renderCenter}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
    />
  );
}
