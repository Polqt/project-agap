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
      title="Available centers"
      subtitle="Open centers appear first, but you can still see the full center list."
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
          title="No centers available"
          description="Center options will appear here once your barangay has published evacuation locations."
        />
      )}
    </SectionCard>
  );
}
