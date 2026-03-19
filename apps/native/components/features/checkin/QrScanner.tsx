import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, Text, View } from "react-native";

export function QrScanner({
  onScan,
  onFallback,
}: {
  onScan: (result: { data: string }) => void;
  onFallback: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return (
      <View className="gap-3">
        <Text className="text-sm leading-6 text-slate-600">
          Camera access is needed for QR check-in.
        </Text>
        <Pressable
          className="rounded-2xl bg-slate-950 px-4 py-4"
          onPress={() => void requestPermission()}
        >
          <Text className="text-center font-semibold text-white">Allow camera access</Text>
        </Pressable>
        <Pressable className="rounded-2xl bg-white px-4 py-4" onPress={onFallback}>
          <Text className="text-center font-semibold text-slate-900">Use manual fallback</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[28px]">
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        className="h-80"
        onBarcodeScanned={onScan}
      />
    </View>
  );
}
