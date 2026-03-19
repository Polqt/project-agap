import { Text, View } from "react-native";

import type { StatusBadgeProps } from "@/types/ui";
import { formatEvacuationStatus } from "@/utils/format";

const STATUS_COLOR: Record<string, string> = {
  checked_in: "bg-emerald-100 text-emerald-700",
  safe: "bg-blue-100 text-blue-700",
  need_help: "bg-rose-100 text-rose-700",
  welfare_check_dispatched: "bg-violet-100 text-violet-700",
  home: "bg-amber-100 text-amber-700",
  unknown: "bg-amber-100 text-amber-700",
  evacuating: "bg-amber-100 text-amber-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = status ? STATUS_COLOR[status] ?? STATUS_COLOR.unknown : STATUS_COLOR.unknown;

  return (
    <View className={`self-start rounded-full px-3 py-1 ${tone.split(" ")[0]}`}>
      <Text className={`text-xs font-semibold ${tone.split(" ")[1]}`}>
        {formatEvacuationStatus(status)}
      </Text>
    </View>
  );
}
