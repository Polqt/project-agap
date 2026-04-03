import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, SectionCard } from "@/shared/components/ui";

import { getCenterQrPreview } from "../services/centerQr";

import type { EvacuationCenter } from "@project-agap/api/supabase";

type Props = {
  centers: EvacuationCenter[];
  isRotating: boolean;
  rotatingCenterId?: string;
  onCopy: (center: EvacuationCenter) => void;
  onShare: (center: EvacuationCenter) => void;
  onRotate: (centerId: string) => void;
};

export function CenterQrCard({
  centers,
  isRotating,
  rotatingCenterId,
  onCopy,
  onShare,
  onRotate,
}: Props) {
  return (
    <SectionCard
      title="Center check-in tokens"
      subtitle="Share or rotate the token used to generate printable QR codes for on-site resident check-in."
    >
      {centers.length ? (
        centers.map((center) => (
          <View key={center.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">{center.name}</Text>
                <Text className="mt-1 text-sm text-slate-500">{center.address}</Text>
                <Text className="mt-3 font-mono text-sm text-slate-700">{getCenterQrPreview(center)}</Text>
              </View>
              <Pill label={center.is_open ? "Open" : "Closed"} tone={center.is_open ? "success" : "warning"} />
            </View>
            <View className="mt-4 gap-3">
              <AppButton
                label="Copy token"
                onPress={() => onCopy(center)}
                variant="ghost"
                disabled={!center.qr_code_token}
              />
              <AppButton label="Share print packet" onPress={() => onShare(center)} variant="secondary" />
              <AppButton
                label="Rotate token"
                onPress={() => onRotate(center.id)}
                loading={isRotating && rotatingCenterId === center.id}
              />
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          title="No centers available"
          description="Create evacuation centers first so Agap can issue on-site check-in tokens."
        />
      )}
    </SectionCard>
  );
}
