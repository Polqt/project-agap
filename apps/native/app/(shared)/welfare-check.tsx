import { Container } from "@/components/container";
import { Text, View } from "react-native";

export default function WelfareCheckScreen() {
  return (
    <Container>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-slate-950">Welfare Check</Text>
        <Text className="mt-3 text-center text-base text-slate-600">
          Welfare dispatch actions will appear here.
        </Text>
      </View>
    </Container>
  );
}
