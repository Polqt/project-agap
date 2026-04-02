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
      description="Send now or monitor recent deliveries."
      feedback={feedback}
      topContent={
        <View className="gap-3">
          <View className="flex-row rounded-[20px] bg-slate-100 p-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.value;

              return (
                <Pressable
                  key={tab.value}
                  onPress={() => setActiveTab(tab.value)}
                  className={`flex-1 rounded-[16px] px-4 py-3 ${isActive ? "bg-white" : ""}`}
                >
                  <Text className={`text-center text-sm font-semibold ${isActive ? "text-slate-950" : "text-slate-500"}`}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className={`rounded-full px-3 py-2 ${isOnline ? "bg-emerald-100" : "bg-amber-100"}`}>
              <Text className={`text-xs font-semibold ${isOnline ? "text-emerald-700" : "text-amber-700"}`}>
                {isOnline ? "Online" : "Offline queue"}
              </Text>
            </View>
            <View className="rounded-full bg-slate-100 px-3 py-2">
              <Text className="text-xs font-semibold text-slate-700">
                {queuedBroadcastCount} pending broadcast action{queuedBroadcastCount === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
        </View>
      }
    >
      {broadcastsError ? (
        <View className="mx-5 mt-5 rounded-[24px] bg-rose-50 px-4 py-4">
          <Text className="text-sm leading-6 text-rose-700">{broadcastsError}</Text>
        </View>
      ) : null}

      {activeTab === "send" ? (
        <>
          <View className="mx-5 mt-5 rounded-[34px] bg-[#eef2ff] px-5 py-5">
            <Text className="text-[28px] font-semibold tracking-[-0.6px] text-slate-950">Push one clear update.</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">
              No approval modal. No extra review step. Publish the instruction residents need right now.
            </Text>
          </View>

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
        </>
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
