import { Text, View } from "react-native";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="items-center gap-2 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8">
      <Text className="text-base font-semibold text-slate-900">{title}</Text>
      <Text className="text-center text-sm leading-5 text-slate-600">{description}</Text>
    </View>
  );
}
