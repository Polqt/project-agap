import { Pressable, Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";

import { BroadcastComposerCard } from "./BroadcastComposerCard";
import { RecentBroadcastsCard } from "./RecentBroadcastsCard";
import { useBroadcastPanel } from "../hooks/useBroadcastPanel";

const tabs = [
  { value: "send" as const, label: "Send" },
  { value: "notifications" as const, label: "Notifications" },
];

export function BroadcastPanel() {
  const {
    form,
    activeTab,
    alerts,
    broadcasts,
    broadcastsError,
    deliveryLanguage,
    deliveryStatsByBroadcastId,
    feedback,
    isLoadingAlerts,
    isLoadingAudience,
    isLoadingBroadcasts,
    isLoadingSmsStats,
    isOnline,
    isRefreshing,
    isSubmitting,
    purokOptions,
    queuedBroadcastCount,
    recipientPreview,
    targetMode,
    applyTemplate,
    changeDeliveryLanguage,
    handleSubmit,
    loadBroadcastIntoComposer,
    setActiveTab,
    setTargetMode,
  } = useBroadcastPanel();

  return (
    <ScreenShell
      title="Broadcast"
      description="Send updates or monitor deliveries."
      feedback={feedback}
      topContent={
        <View className="gap-3">
          {/* Segmented tab control */}
          <View className="flex-row rounded-xl bg-slate-100 p-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.value;

              return (
                <Pressable
                  key={tab.value}
                  onPress={() => setActiveTab(tab.value)}
                  className={`flex-1 items-center rounded-lg py-2.5 ${isActive ? "bg-white shadow-sm" : ""}`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${isActive ? "text-slate-900" : "text-slate-400"}`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Status row */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5">
              <View
                className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <Text className="text-[11px] font-semibold text-slate-500">
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
            {queuedBroadcastCount > 0 ? (
              <View className="rounded-md bg-amber-50 px-2.5 py-1.5">
                <Text className="text-[11px] font-semibold text-amber-600">
                  {queuedBroadcastCount} queued
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      }
    >
      {broadcastsError ? (
        <View className="mx-6 mt-4 rounded-xl bg-rose-50 px-4 py-3">
          <Text className="text-[13px] leading-5 text-rose-600">{broadcastsError}</Text>
        </View>
      ) : null}

      {activeTab === "send" ? (
        <BroadcastComposerCard
          deliveryLanguage={deliveryLanguage}
          form={form}
          isLoadingAudience={isLoadingAudience}
          isSubmitting={isSubmitting}
          purokOptions={purokOptions}
          recipientPreview={recipientPreview}
          targetMode={targetMode}
          onChangeDeliveryLanguage={changeDeliveryLanguage}
          onChangeTargetMode={(value) => {
            setTargetMode(value);
            if (value === "all") {
              form.setValue("targetPurok", "");
            }
          }}
          onSelectPurok={(value) => {
            form.setValue("targetPurok", value);
          }}
          onSelectTemplate={applyTemplate}
          onSubmit={handleSubmit}
        />
      ) : (
        <RecentBroadcastsCard
          alerts={alerts}
          broadcasts={broadcasts}
          deliveryStatsByBroadcastId={deliveryStatsByBroadcastId}
          isRefreshing={isRefreshing || isLoadingAlerts || isLoadingBroadcasts || isLoadingSmsStats}
          onLongPressBroadcast={loadBroadcastIntoComposer}
        />
      )}
    </ScreenShell>
  );
}
