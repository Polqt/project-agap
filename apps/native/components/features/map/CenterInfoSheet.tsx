import type { EvacuationCenter } from "@project-agap/api/supabase";

import BottomSheet from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/app/empty-state";
import { formatDistance } from "@/utils/format";

type CenterWithDistance = EvacuationCenter & {
  distanceMeters: number | null;
};

const CenterRow = memo(function CenterRow({
  item,
  onPress,
}: {
  item: CenterWithDistance;
  onPress: (item: CenterWithDistance) => void;
}) {
  return (
    <Pressable
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
      onPress={() => onPress(item)}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
          <Text className="text-sm text-slate-600">{item.address}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${item.is_open ? "bg-emerald-100" : "bg-rose-100"}`}>
          <Text className={`text-xs font-semibold ${item.is_open ? "text-emerald-700" : "text-rose-700"}`}>
            {item.is_open ? "Open" : "Closed"}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm text-slate-500">{formatDistance(item.distanceMeters)}</Text>
        <Text className="text-sm font-medium text-blue-700">
          {item.current_occupancy}/{item.capacity} occupied
        </Text>
      </View>
    </Pressable>
  );
});

export function CenterInfoSheet({
  bottomSheetRef,
  centers,
  selectedCenter,
  onCenterPress,
  onCheckIn,
}: {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  centers: CenterWithDistance[];
  selectedCenter: CenterWithDistance | null;
  onCenterPress: (center: CenterWithDistance) => void;
  onCheckIn: (centerId: string) => void;
}) {
  const renderCenter = useCallback(
    ({ item }: { item: CenterWithDistance }) => <CenterRow item={item} onPress={onCenterPress} />,
    [onCenterPress],
  );

  return (
    <BottomSheet index={0} ref={bottomSheetRef} snapPoints={["20%", "45%", "78%"]}>
      <View className="flex-1 px-5 pb-8">
        {selectedCenter ? (
          <View className="gap-3">
            <Text className="text-xl font-semibold text-slate-950">{selectedCenter.name}</Text>
            <Text className="text-sm leading-6 text-slate-600">{selectedCenter.address}</Text>
            <View className="flex-row flex-wrap gap-2">
              <View className="rounded-full bg-blue-50 px-3 py-1">
                <Text className="text-xs font-semibold text-blue-700">
                  Distance: {formatDistance(selectedCenter.distanceMeters)}
                </Text>
              </View>
              <View className="rounded-full bg-slate-100 px-3 py-1">
                <Text className="text-xs font-semibold text-slate-700">
                  Occupancy: {selectedCenter.current_occupancy}/{selectedCenter.capacity}
                </Text>
              </View>
              {selectedCenter.contact_number ? (
                <View className="rounded-full bg-emerald-50 px-3 py-1">
                  <Text className="text-xs font-semibold text-emerald-700">
                    Contact: {selectedCenter.contact_number}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              className="rounded-2xl bg-[#1A56C4] px-4 py-4"
              onPress={() => onCheckIn(selectedCenter.id)}
            >
              <Text className="text-center text-base font-semibold text-white">Check In Here</Text>
            </Pressable>
          </View>
        ) : (
          <EmptyState
            title="No evacuation centers"
            description="Centers will appear here once your barangay publishes them."
          />
        )}

        <Text className="mb-3 mt-6 text-base font-semibold text-slate-900">
          Nearest evacuation centers
        </Text>
        <FlashList
          data={centers}
          keyExtractor={(item) => item.id}
          renderItem={renderCenter}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BottomSheet>
  );
}
