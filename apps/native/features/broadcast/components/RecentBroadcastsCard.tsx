import { Pressable, Text, View } from "react-native";

import { EmptyState } from "@/shared/components/ui";
import { formatDateTime } from "@/shared/utils/date";
import type { Alert } from "@project-agap/api/supabase";

import type { BroadcastTimelineItem } from "../services/broadcasts";

type DeliveryStats = {
  sent: number;
  delivered: number;
  replied: number;
  failed: number;
  total: number;
};

type Props = {
  alerts: Alert[];
  broadcasts: BroadcastTimelineItem[];
  deliveryStatsByBroadcastId: Map<string, DeliveryStats>;
  isRefreshing?: boolean;
  onLongPressBroadcast: (broadcast: BroadcastTimelineItem) => void;
};

function syncLabel(syncState: BroadcastTimelineItem["syncState"]) {
  switch (syncState) {
    case "publishing":
      return { label: "Syncing", dot: "bg-blue-500" };
    case "queued":
      return { label: "Queued", dot: "bg-amber-500" };
    case "failed":
      return { label: "Retry", dot: "bg-rose-500" };
    default:
      return { label: "Sent", dot: "bg-emerald-500" };
  }
}

function severityColor(severity: Alert["severity"]) {
  switch (severity) {
    case "warning":
    case "danger":
      return "border-rose-200 bg-rose-50";
    case "watch":
      return "border-amber-200 bg-amber-50";
    default:
      return "border-slate-200 bg-slate-50";
  }
}

export function RecentBroadcastsCard({
  alerts,
  broadcasts,
  deliveryStatsByBroadcastId,
  isRefreshing,
  onLongPressBroadcast,
}: Props) {
  return (
    <View className="mx-6 mt-4 gap-6">
      {/* Active agency alerts */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            Agency alerts
          </Text>
          {isRefreshing ? (
            <Text className="text-[11px] font-medium text-slate-300">Refreshing</Text>
          ) : null}
        </View>

        {alerts.length ? (
          <View className="gap-2.5">
            {alerts.map((alert) => (
              <View
                key={alert.id}
                className={`rounded-xl border p-3.5 ${severityColor(alert.severity)}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {alert.source} / {alert.severity}
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    {formatDateTime(alert.issued_at)}
                  </Text>
                </View>
                <Text className="mt-2 text-[15px] font-semibold text-slate-900">
                  {alert.title}
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-slate-600">{alert.body}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No active alerts"
            description="PAGASA and PHIVOLCS alerts appear here when active."
          />
        )}
      </View>

      {/* Broadcast history */}
      <View className="gap-3">
        <Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Broadcast history
        </Text>

        {broadcasts.length ? (
          <View className="gap-2.5">
            {broadcasts.map((broadcast) => {
              const stats = deliveryStatsByBroadcastId.get(broadcast.id) ?? {
                sent: 0,
                delivered: 0,
                replied: 0,
                failed: 0,
                total: 0,
              };
              const sync = syncLabel(broadcast.syncState);

              return (
                <Pressable
                  key={broadcast.id}
                  onLongPress={() => onLongPressBroadcast(broadcast)}
                  delayLongPress={220}
                  className="rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  {/* Header: type + sync state */}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {broadcast.broadcast_type.replaceAll("_", " ")}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <View className={`h-1.5 w-1.5 rounded-full ${sync.dot}`} />
                      <Text className="text-[11px] font-semibold text-slate-500">{sync.label}</Text>
                    </View>
                  </View>

                  {/* Message */}
                  <Text className="mt-2 text-[14px] font-medium leading-5 text-slate-800" numberOfLines={2}>
                    {broadcast.message}
                  </Text>

                  {/* Target */}
                  <Text className="mt-1 text-[12px] text-slate-400">
                    {broadcast.target_purok ?? "Entire barangay"}
                  </Text>

                  {/* Delivery stats */}
                  <View className="mt-3 flex-row gap-3">
                    <Text className="text-[11px] font-medium text-slate-500">
                      {stats.sent} sent
                    </Text>
                    <Text className="text-[11px] font-medium text-slate-500">
                      {stats.delivered} delivered
                    </Text>
                    {stats.replied > 0 ? (
                      <Text className="text-[11px] font-medium text-emerald-600">
                        {stats.replied} replied
                      </Text>
                    ) : null}
                    {stats.failed > 0 ? (
                      <Text className="text-[11px] font-medium text-rose-500">
                        {stats.failed} failed
                      </Text>
                    ) : null}
                  </View>

                  {/* Timestamp */}
                  <Text className="mt-2 text-[11px] text-slate-300">
                    {formatDateTime(broadcast.sent_at)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <EmptyState
            title="No broadcasts yet"
            description="Your first broadcast and its delivery stats will appear here."
          />
        )}
      </View>
    </View>
  );
}
