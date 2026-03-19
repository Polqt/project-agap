import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LoadingScreenProps = {
  label?: string;
};

export function LoadingScreen({
  label = "Inihahanda ang Agap...",
}: LoadingScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-600/20">
          <ActivityIndicator color="#93C5FD" size="large" />
        </View>
        <View className="items-center gap-1">
          <Text className="text-2xl font-semibold text-white">Agap</Text>
          <Text className="text-center text-sm text-slate-300">{label}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
