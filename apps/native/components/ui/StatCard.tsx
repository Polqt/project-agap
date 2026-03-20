import { Text, View } from "react-native";

import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export function StatCard({
  label,
  value,
  tone,
  isLoading = false,
}: {
  label: string;
  value: number;
  tone: "safe" | "needHelp" | "unaccounted" | "neutral";
  isLoading?: boolean;
}) {
  const toneClassName =
    tone === "safe"
      ? "bg-emerald-500"
      : tone === "needHelp"
        ? "bg-rose-500"
        : tone === "unaccounted"
          ? "bg-amber-500"
          : "bg-slate-950";

  return (
    <View className={`flex-1 rounded-[24px] px-4 py-5 ${toneClassName}`}>
      <Text className="text-sm text-white/80">{label}</Text>
      {isLoading ? (
        <View className="mt-3">
          <LoadingSkeleton className="h-8 w-20 bg-white/25" />
        </View>
      ) : (
        <Text className="mt-2 text-3xl font-semibold text-white">{value}</Text>
      )}
    </View>
  );
}
