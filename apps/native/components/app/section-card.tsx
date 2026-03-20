import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  accentClassName?: string;
}>;

export function SectionCard({
  children,
  title,
  description,
  accentClassName = "bg-white",
}: SectionCardProps) {
  return (
    <View className={`gap-4 rounded-[28px] border border-slate-200 p-5 ${accentClassName}`}>
      <View className="gap-1">
        <Text className="text-lg font-semibold text-slate-900">{title}</Text>
        {description ? <Text className="text-sm leading-5 text-slate-600">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}
