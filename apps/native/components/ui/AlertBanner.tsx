import { Text, View } from "react-native";

import type { AlertBannerProps } from "@/types/ui";
import { getSeverityMeta } from "@/utils/format";

export function AlertBanner({ alert }: AlertBannerProps) {
  if (!alert) {
    return null;
  }

  const severity = getSeverityMeta(alert.severity);

  return (
    <View className="rounded-[28px] bg-slate-950 px-5 py-5">
      <View className="flex-row items-center gap-2">
        <View className={`rounded-full px-3 py-1 ${severity.className.split(" ")[0]}`}>
          <Text className={`text-xs font-semibold ${severity.className.split(" ")[1]}`}>
            {severity.label}
          </Text>
        </View>
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-slate-300">
          {alert.source}
        </Text>
      </View>
      <Text className="mt-3 text-lg font-semibold text-white">
        {alert.title_filipino || alert.title}
      </Text>
      <Text className="mt-1 text-sm leading-6 text-slate-300" numberOfLines={2}>
        {alert.body_filipino || alert.body}
      </Text>
    </View>
  );
}
