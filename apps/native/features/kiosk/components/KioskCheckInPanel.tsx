import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { CheckInFlow } from "@/features/checkin/components/CheckInFlow";

export function KioskCheckInPanel() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="flex-row items-center justify-between border-b border-white/10 px-5 pb-4 pt-14">
        <View className="flex-1 pr-4">
          <Text className="text-xs font-semibold uppercase tracking-widest text-amber-400">Kiosk mode</Text>
          <Text className="mt-1 text-2xl font-bold text-white">Walk-in check-in</Text>
          <Text className="mt-2 text-base leading-6 text-white/75">
            Shared tablet sa evacuation center. Malaking pindutan, mataas na contrast.
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3"
        >
          <Text className="text-lg font-bold text-white">Back</Text>
        </Pressable>
      </View>
      {/* flex-1 + min-h-0 so nested KeyboardAwareScrollView gets a bounded height and can scroll */}
      <View className="min-h-0 flex-1">
        <CheckInFlow kioskMode />
      </View>
    </View>
  );
}
