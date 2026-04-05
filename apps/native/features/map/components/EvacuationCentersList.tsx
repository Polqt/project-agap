import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDistanceKm } from "@/shared/utils/geo";

import type { RankedEvacuationRoute } from "../types";

type Props = {
  bottomSheetRef: RefObject<BottomSheet | null>;
  rankedRoutes: RankedEvacuationRoute[];
  selectedCenterId: string | null;
  selectedRoute: RankedEvacuationRoute | null;
  isLoading: boolean;
  errorMessage: string | null;
  onSelectCenter: (centerId: string) => void;
};

export function EvacuationCentersList({
  bottomSheetRef,
  rankedRoutes,
  selectedCenterId,
  selectedRoute,
  isLoading,
  errorMessage,
  onSelectCenter,
}: Props) {
  const insets = useSafeAreaInsets();
  const selectedRouteId = selectedCenterId ?? selectedRoute?.center.id ?? null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={["18%", "38%", "56%"]}
      enablePanDownToClose={false}
      backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View className="gap-4 pb-2">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-blue-600">
              Evacuation route
            </Text>
            <Text className="mt-1 text-[22px] font-bold text-slate-950">
              {selectedRoute?.center.name ?? "Choose a destination"}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              {selectedRoute?.center.address ?? "Nearest open centers will appear here."}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {rankedRoutes.map((route) => (
              <Pressable
                key={route.center.id}
                onPress={() => onSelectCenter(route.center.id)}
                className={`rounded-full border px-3 py-2 ${
                  selectedRouteId === route.center.id
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedRouteId === route.center.id ? "text-white" : "text-slate-700"
                  }`}
                >
                  {route.rank}. {route.center.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedRoute ? <SummaryCard route={selectedRoute} /> : null}

          {selectedRoute?.notice ? (
            <View className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
              <Text className="text-sm font-medium text-sky-800">{selectedRoute.notice}</Text>
            </View>
          ) : null}

          {isLoading ? (
            <View className="rounded-2xl bg-slate-100 px-4 py-3">
              <Text className="text-sm font-medium text-slate-500">
                Calculating the fastest available road route...
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <Text className="text-sm font-medium text-rose-700">{errorMessage}</Text>
            </View>
          ) : null}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function SummaryCard({ route }: { route: RankedEvacuationRoute }) {
  const capacityStatus = getCapacityStatus(route.center.currentOccupancy, route.center.capacity);

  return (
    <View className="rounded-[28px] bg-slate-950 px-5 py-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-slate-300">Destination summary</Text>
          <Text className="mt-1 text-2xl font-bold text-white">
            {formatDistanceKm(route.roadDistanceKm)}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${capacityStatus.toneClassName}`}>
          <Text className="text-xs font-semibold text-white">{capacityStatus.label}</Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <MetaPill icon="car" label={formatDuration(route.drivingDurationMinutes, "Drive")} />
        <MetaPill icon="walk" label={formatDuration(route.walkingDurationMinutes, "Walk")} />
        <MetaPill icon="speedometer" label={`Safety ${route.safetyScore}/100`} />
        {route.predictedTrafficDelayMinutes !== null ? (
          <MetaPill icon="time" label={`Traffic +${route.predictedTrafficDelayMinutes} min`} />
        ) : null}
      </View>
    </View>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-full bg-white/10 px-3 py-2">
      <Ionicons name={icon} size={14} color="#bfdbfe" />
      <Text className="text-sm font-medium text-slate-100">{label}</Text>
    </View>
  );
}

function formatDuration(minutes: number | null, label: string) {
  if (!minutes) {
    return `${label}: unavailable`;
  }

  return `${label}: ${minutes} min`;
}

function getCapacityStatus(currentOccupancy: number, capacity: number) {
  if (capacity <= 0) {
    return {
      label: "Capacity unknown",
      toneClassName: "bg-slate-500",
    };
  }

  const loadRatio = currentOccupancy / capacity;

  if (loadRatio >= 1) {
    return {
      label: "Full",
      toneClassName: "bg-rose-500",
    };
  }

  if (loadRatio >= 0.85) {
    return {
      label: "Limited",
      toneClassName: "bg-amber-500",
    };
  }

  return {
    label: "Available",
    toneClassName: "bg-emerald-500",
  };
}
