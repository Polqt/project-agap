import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import type { EvacuationCenter } from "@project-agap/api/supabase";

type Props = {
  centers: EvacuationCenter[];
  isUpdating: boolean;
  updatingCenterId?: string;
  onToggle: (centerId: string, isOpen: boolean) => void;
};

export function CenterStatusCard({
  centers,
  isUpdating,
  updatingCenterId,
  onToggle,
}: Props) {
  return (
    <SectionCard
      title="Evacuation centers"
      subtitle="Open or close center availability directly from the dashboard."
    >
      {centers.length ? (
        centers.map((center) => (
          <View key={center.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">{center.name}</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {center.current_occupancy}/{center.capacity} occupants
                </Text>
              </View>
              <Pill
                label={center.is_open ? "Open" : "Closed"}
                tone={center.is_open ? "success" : "warning"}
              />
            </View>
            <View className="mt-4">
              <AppButton
                label={center.is_open ? "Close center" : "Open center"}
                onPress={() => onToggle(center.id, !center.is_open)}
                variant={center.is_open ? "secondary" : "primary"}
                loading={isUpdating && updatingCenterId === center.id}
              />
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          title="No centers configured"
          description="Center controls will appear here after evacuation centers are created for the barangay."
        />
      )}
    </SectionCard>
  );
}
