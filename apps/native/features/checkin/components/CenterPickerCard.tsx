import { Pressable, Text, View } from "react-native";

import { EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import type { EvacuationCenter } from "@project-agap/api/supabase";

type Props = {
  centers: EvacuationCenter[];
  selectedCenterId: string | null;
  onSelect: (centerId: string) => void;
};

export function CenterPickerCard({ centers, selectedCenterId, onSelect }: Props) {
  return (
    <SectionCard
      title="Open centers"
      subtitle="Choose the evacuation center where the household is currently staying."
    >
      {centers.length ? (
        centers.map((center) => (
          <Pressable
            key={center.id}
            onPress={() => onSelect(center.id)}
            className={`mb-3 rounded-2xl border px-4 py-4 ${selectedCenterId === center.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
          >
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">{center.name}</Text>
                <Text className="mt-1 text-sm text-slate-500">{center.address}</Text>
              </View>
              <Pill label={center.is_open ? "Open" : "Closed"} tone={center.is_open ? "success" : "warning"} />
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState
          title="No open centers available"
          description="Manual and proxy check-in will be ready once your barangay opens an evacuation center."
        />
      )}
    </SectionCard>
  );
}
