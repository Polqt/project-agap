import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton, SectionCard } from "@/shared/components/ui";

type Props = {
  isSubmitting: boolean;
  onScan: (qrToken: string) => Promise<void>;
  onManualFallback: () => void;
  kiosk?: boolean;
};

export function QrCheckInCard({ isSubmitting, onScan, onManualFallback, kiosk = false }: Props) {
  const btnSize = kiosk ? "kiosk" : "default";
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanLocked, setIsScanLocked] = useState(false);

  async function handleRequestPermission() {
    const nextPermission = await requestPermission();

    if (!nextPermission.granted) {
      onManualFallback();
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (isSubmitting || isScanLocked) {
      return;
    }

    setIsScanLocked(true);
    void onScan(result.data);
  }

  if (!permission?.granted) {
    return (
      <SectionCard
        title="QR code check-in"
        subtitle="Scan the center QR code for instant validation. If camera access is unavailable, switch to manual check-in."
      >
        <Text className="text-sm leading-6 text-slate-600">
          {permission
            ? "Camera access is needed to scan the evacuation center QR code."
            : "Agap is preparing camera access for QR check-in."}
        </Text>
        <View className="mt-4 gap-3">
          <AppButton
            label={permission ? "Allow camera access" : "Enable QR scanning"}
            onPress={() => void handleRequestPermission()}
            size={btnSize}
          />
          <AppButton
            label="Use manual check-in"
            onPress={onManualFallback}
            variant="ghost"
            size={btnSize}
          />
        </View>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="QR code check-in"
      subtitle="Point your camera at the evacuation center QR token for instant validation."
    >
      <View
        className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950"
        style={{ height: kiosk ? 340 : 280 }}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      </View>
      <Text className="mt-4 text-sm leading-6 text-slate-600">
        {isScanLocked
          ? "Scan captured. Review the result below or scan another code."
          : "Keep the QR code inside the frame until Agap detects it."}
      </Text>
      <View className="mt-4 gap-3">
        {isScanLocked ? (
          <AppButton
            label="Scan another code"
            onPress={() => setIsScanLocked(false)}
            variant="ghost"
            size={btnSize}
          />
        ) : null}
        <AppButton
          label="Use manual check-in"
          onPress={onManualFallback}
          variant="ghost"
          size={btnSize}
        />
      </View>
    </SectionCard>
  );
}
