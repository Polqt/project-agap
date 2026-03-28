import { Text, View } from "react-native";

import { Container } from "@/shared/components/container";

export default function ModalScreen() {
  return (
    <Container>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-slate-950">Agap</Text>
        <Text className="mt-3 text-center text-base text-slate-600">
          Modal routes can be registered here as shared flows grow.
        </Text>
      </View>
    </Container>
  );
}
