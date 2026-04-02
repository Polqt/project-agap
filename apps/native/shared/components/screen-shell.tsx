import { ActivityIndicator, Text, View } from "react-native";

import { EmptyState, ScreenHeader } from "./ui";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  feedback?: string | null;
  isLoading?: boolean;
  loadingLabel?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
};

export function ScreenShell({
  eyebrow,
  title,
  description,
  action,
  feedback,
  isLoading,
  loadingLabel = "Loading...",
  isEmpty,
  emptyTitle = "No data yet",
  emptyDescription = "Data will appear here once available.",
  children,
}: Props) {
  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      {feedback ? (
        <View className="mx-5 mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
        </View>
      ) : null}
      {isLoading ? (
        <View className="mx-5 mt-5 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <ActivityIndicator color="#0f172a" />
          <Text className="text-sm text-slate-600">{loadingLabel}</Text>
        </View>
      ) : null}
      {isEmpty ? (
        <View className="mx-5 mt-5">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </View>
      ) : null}
      {children}
    </View>
  );
}
