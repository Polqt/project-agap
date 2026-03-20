import { View } from "react-native";

export function LoadingSkeleton({
  className = "h-5 w-full",
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <View className="gap-3">
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={`skeleton-${index}`}
          className={`animate-pulse rounded-2xl bg-slate-200 ${className}`}
        />
      ))}
    </View>
  );
}
