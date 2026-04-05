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
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10"
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-6 pb-2">
            <View className="flex-row items-end justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[32px] font-bold tracking-[-0.8px] text-slate-900">
                  {title}
                </Text>
                {description ? (
                  <Text className="mt-1 text-[15px] leading-5.5 text-slate-400">
                    {description}
                  </Text>
                ) : null}
              </View>
              {action ? <View className="mb-1">{action}</View> : null}
            </View>
          </View>

          {/* Top content slot */}
          {topContent ? <View className="px-6 pt-4 pb-2">{topContent}</View> : null}

          {/* Feedback banner */}
          {feedback ? (
            <View className="mx-6 mt-3">
              <View className="flex-row items-center gap-2.5 rounded-2xl bg-emerald-50 px-4 py-3">
                <View className="h-2 w-2 rounded-full bg-emerald-500" />
                <Text className="flex-1 text-[13px] leading-4.5 font-medium text-emerald-700">
                  {feedback}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Loading state */}
          {isLoading ? (
            <View className="mx-6 mt-4">
              <View className="flex-row items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">
                <ActivityIndicator size="small" color="#64748b" />
                <Text className="text-[13px] font-medium text-slate-500">{loadingLabel}</Text>
              </View>
            </View>
          ) : null}

          {/* Empty state */}
          {isEmpty ? (
            <View className="mx-6 mt-6">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </View>
          ) : null}

          {/* Main content */}
          {children}
        </ScrollView>

        {/* Floating action */}
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
