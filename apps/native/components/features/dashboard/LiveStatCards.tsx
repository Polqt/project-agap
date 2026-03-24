import { View } from "react-native";

import { StatCard } from "@/components/ui/StatCard";

export interface LiveStatCardsProps {
  checkedIn: number;
  safe: number;
  needHelp: number;
  unaccounted: number;
  isLoading: boolean;
}

export function LiveStatCards({
  checkedIn,
  safe,
  needHelp,
  unaccounted,
  isLoading,
}: LiveStatCardsProps) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <StatCard label="Checked In" value={checkedIn} tone="neutral" isLoading={isLoading} />
        <StatCard label="Safe" value={safe} tone="safe" isLoading={isLoading} />
      </View>
      <View className="flex-row gap-3">
        <StatCard label="Need Help" value={needHelp} tone="needHelp" isLoading={isLoading} />
        <StatCard label="Unaccounted" value={unaccounted} tone="unaccounted" isLoading={isLoading} />
      </View>
    </View>
  );
}
