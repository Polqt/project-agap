import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "./ui";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  feedback?: string | null;
  topContent?: React.ReactNode;
  floatingAction?: React.ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
};

export function ScreenShell({
  title,
  description,
  action,
  feedback,
  topContent,
  floatingAction,
  isLoading,
  loadingLabel = "Loading...",
  isEmpty,
  emptyTitle = "No data yet",
  emptyDescription = "Data will appear here once available.",
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-slate-50">
      <View
        className="border-b border-slate-200 bg-slate-50/95 px-5 pb-4"
        style={{
          paddingTop: insets.top + 10,
        }}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text className="text-[28px] font-semibold tracking-[-0.6px] text-slate-950">{title}</Text>
            {description ? <Text className="text-sm leading-5 text-slate-500">{description}</Text> : null}
          </View>
          {action ? <View className="self-center">{action}</View> : null}
        </View>
      </View>

      {topContent ? <View className="border-b border-slate-200 bg-slate-50 px-5 py-4">{topContent}</View> : null}

      {feedback ? (
        <View className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <View className="rounded-2xl bg-white px-4 py-3">
            <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <View className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <View className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3">
            <ActivityIndicator color="#0f172a" />
            <Text className="text-sm text-slate-600">{loadingLabel}</Text>
          </View>
        </View>
      ) : null}

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-8"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {isEmpty ? (
            <View className="mx-5 mt-5">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </View>
          ) : null}
          {children}
        </ScrollView>

        {floatingAction ? (
          <View
            pointerEvents="box-none"
            className="absolute inset-x-0 bottom-0"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            {floatingAction}
          </View>
        ) : null}
      </View>
    </View>
  );
}
