import { Text, View } from "react-native";

import { T } from "@/utils/i18n";

export function OfflineBanner({
  isOnline,
  queueSize = 0,
}: {
  isOnline: boolean;
  queueSize?: number;
}) {
  if (isOnline) {
    return null;
  }

  return (
    <View className="rounded-2xl bg-amber-100 px-4 py-3">
      <Text className="text-sm font-medium text-amber-800">
        {T.noConnection}
        {queueSize > 0 ? ` ${queueSize} queued.` : ""}
      </Text>
    </View>
  );
}
