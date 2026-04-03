import { Text, View } from "react-native";

import { AppButton, EmptyState, ScreenHeader } from "@/shared/components/ui";
import { formatDateTime } from "@/shared/utils/date";

import { AlertCard } from "./AlertCard";
import { useAlertsFeed } from "../hooks/useAlertsFeed";

export function AlertsFeed() {
  const {
    alerts,
    broadcasts,
    isLoading,
    isRefreshing,
    isAlertError,
    alertErrorMessage,
    isBroadcastError,
    broadcastErrorMessage,
    refresh,
    openAlertDetail,
  } = useAlertsFeed();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="Resident updates"
        title="Current alerts"
        description="Official broadcasts and hazard advisories for your barangay appear in one stream."
        action={<AppButton label="Refresh" onPress={() => void refresh()} variant="ghost" loading={isRefreshing} />}
      />

      <View className="mx-5 mt-5 overflow-hidden rounded-[36px] bg-white px-5 py-5 shadow-sm">
        <Text className="text-lg font-semibold text-slate-950">Barangay broadcasts</Text>
        <Text className="mt-1 text-sm leading-6 text-slate-500">
          Messages sent by barangay officials show up here as soon as they hit Supabase.
        </Text>

        {isBroadcastError ? (
          <Text className="mt-4 rounded-[22px] bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            {broadcastErrorMessage ?? "Unable to refresh broadcasts."}
          </Text>
        ) : broadcasts.length ? (
          <View className="mt-4 gap-3">
            {broadcasts.slice(0, 5).map((broadcast) => (
              <View key={broadcast.id} className="rounded-[28px] bg-slate-100 px-4 py-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-950">
                      {broadcast.broadcast_type.replaceAll("_", " ").toUpperCase()}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-600">{broadcast.message}</Text>
                  </View>
                  <Text className="text-xs font-semibold uppercase tracking-[1.1px] text-slate-400">
                    {formatDateTime(broadcast.sent_at)}
                  </Text>
                </View>
                {broadcast.message_filipino ? (
                  <Text className="mt-3 text-sm leading-6 text-slate-500">{broadcast.message_filipino}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View className="mt-4">
            <EmptyState
              title={isLoading ? "Loading broadcasts" : "No official broadcasts yet"}
              description="When barangay officials publish a direct update, it will show here immediately."
            />
          </View>
        )}
      </View>

      {isAlertError ? (
        <View className="mx-5 mt-5 rounded-[28px] bg-rose-50 px-4 py-4">
          <Text className="text-sm leading-6 text-rose-700">
            {alertErrorMessage ?? "Unable to refresh hazard alerts."}
          </Text>
        </View>
      ) : null}

      {alerts.length ? (
        alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onPress={() => openAlertDetail(alert.id)} />
        ))
      ) : (
        <View className="mx-5 mt-5">
          <EmptyState
            title={isLoading || isRefreshing ? "Loading alerts" : "No active hazard alerts"}
            description={
              isLoading || isRefreshing
                ? "Agap is checking for the latest warnings and advisories in your barangay."
                : "When PAGASA, PHIVOLCS, or your barangay issues an alert, it will show here."
            }
          />
        </View>
      )}
    </View>
  );
}
