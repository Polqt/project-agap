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
      return { label: "Syncing", tone: "bg-blue-100 text-blue-700" };
    case "queued":
      return { label: "Queued", tone: "bg-amber-100 text-amber-700" };
    case "failed":
      return { label: "Retry", tone: "bg-rose-100 text-rose-700" };
    default:
      return { label: "Sent", tone: "bg-emerald-100 text-emerald-700" };
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
    <View className="mx-5 mt-5 mb-8 gap-5">
      <View className="rounded-[34px] bg-white px-5 py-5 shadow-sm">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-slate-950">Active agency alerts</Text>
            <Text className="mt-1 text-sm leading-6 text-slate-500">
              PAGASA and PHIVOLCS alerts stay pinned here while they are active.
            </Text>
          </View>
          {isRefreshing ? <Text className="text-xs font-semibold text-slate-400">Refreshing</Text> : null}
        </View>

        {alerts.length ? (
          <View className="mt-4 gap-3">
            {alerts.map((alert) => (
              <View key={alert.id} className="rounded-[26px] bg-slate-100 px-4 py-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-[1.1px] text-slate-500">
                      {alert.source.toUpperCase()} / {alert.severity.toUpperCase()}
                    </Text>
                    <Text className="mt-2 text-base font-semibold text-slate-950">{alert.title}</Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-600">{alert.body}</Text>
                  </View>
                  <Text className="text-xs text-slate-400">{formatDateTime(alert.issued_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="mt-4">
            <EmptyState
              title="No active PAGASA or PHIVOLCS alerts"
              description="Agency alerts will appear here automatically when they are active for Banago."
            />
          </View>
        )}
      </View>

      <View className="rounded-[34px] bg-white px-5 py-5 shadow-sm">
        <Text className="text-lg font-semibold text-slate-950">Broadcast history</Text>
        <Text className="mt-1 text-sm leading-6 text-slate-500">
          Long-press any item to load it back into Send for a fast re-broadcast.
        </Text>

        {broadcasts.length ? (
          <View className="mt-4 gap-3">
            {broadcasts.map((broadcast) => {
              const stats =
                deliveryStatsByBroadcastId.get(broadcast.id) ?? {
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
                  className="rounded-[26px] bg-slate-100 px-4 py-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold uppercase tracking-[1.1px] text-slate-500">
                        {broadcast.broadcast_type.replaceAll("_", " ")}
                      </Text>
                      <Text className="mt-2 text-base font-semibold text-slate-950">{broadcast.message}</Text>
                      <Text className="mt-2 text-sm text-slate-500">
                        {broadcast.target_purok ? `Target: ${broadcast.target_purok}` : "Target: Entire barangay"}
                      </Text>
                    </View>
                    <View className={`rounded-full px-3 py-1 ${sync.tone}`}>
                      <Text className="text-xs font-semibold">{sync.label}</Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-white px-3 py-1">
                      <Text className="text-xs font-semibold text-slate-700">Sent {stats.sent}</Text>
                    </View>
                    <View className="rounded-full bg-white px-3 py-1">
                      <Text className="text-xs font-semibold text-slate-700">Delivered {stats.delivered}</Text>
                    </View>
                    <View className="rounded-full bg-white px-3 py-1">
                      <Text className="text-xs font-semibold text-slate-700">Replied {stats.replied}</Text>
                    </View>
                    {stats.failed > 0 ? (
                      <View className="rounded-full bg-white px-3 py-1">
                        <Text className="text-xs font-semibold text-rose-700">Failed {stats.failed}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text className="mt-3 text-xs text-slate-400">{formatDateTime(broadcast.sent_at)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View className="mt-4">
            <EmptyState
              title="No broadcasts yet"
              description="The first direct broadcast will appear here with delivery stats once it is sent."
            />
          </View>
        )}
      </View>
    </View>
  );
}
