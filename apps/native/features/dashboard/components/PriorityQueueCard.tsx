import { memo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import { formatRelativeTime } from "@/shared/utils/date";
import type { StatusPing } from "@project-agap/api/supabase";

type Props = {
  unresolvedPings: StatusPing[];
  isResolving: boolean;
  resolvingPingId?: string;
  onResolve: (pingId: string) => void;
};

function PriorityQueueCardComponent({
  unresolvedPings,
  isResolving,
  resolvingPingId,
  onResolve,
}: Props) {
  return (
    <SectionCard
      title="Priority queue"
      subtitle="Unresolved need-help pings are surfaced first for quick action."
    >
      {unresolvedPings.length ? (
        unresolvedPings.slice(0, 8).map((ping) => (
          <View key={ping.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">
                  {ping.status === "need_help" ? "Kailangan ng Tulong" : "Ligtas Ako"}
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {ping.message || "No additional resident note"}
                </Text>
                <Text className="mt-2 text-xs uppercase tracking-[1.2px] text-slate-400">
                  {formatRelativeTime(ping.pinged_at)}
                </Text>
              </View>
              <View className="gap-1.5 items-end">
                <Pill
                  label={ping.status === "need_help" ? "TULONG" : "LIGTAS"}
                  tone={ping.status === "need_help" ? "danger" : "success"}
                />
                <Pill
                  label={ping.channel === "sms" ? "SMS" : "APP"}
                  tone={ping.channel === "sms" ? "warning" : "info"}
                />
              </View>
            </View>
            <View className="mt-3 flex-row justify-end">
              <Pressable
                onPress={() => onResolve(ping.id)}
                disabled={isResolving && resolvingPingId === ping.id}
                className="flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 active:bg-slate-50"
              >
                {isResolving && resolvingPingId === ping.id ? (
                  <ActivityIndicator size="small" color="#64748b" />
                ) : null}
                <Text className="text-xs font-semibold text-slate-600">Mark resolved</Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          title="No unresolved pings"
          description="Need-help pings appear here after residents report them to the server. Pings still queued offline on other devices will show up once those devices reconnect."
        />
      )}
      {unresolvedPings.length > 8 ? (
        <Text className="mt-2 text-xs text-slate-500">
          Showing first 8 pings. Resolve items to keep this queue manageable.
        </Text>
      ) : null}
    </SectionCard>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const PriorityQueueCard = memo(PriorityQueueCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.unresolvedPings.length === nextProps.unresolvedPings.length &&
    prevProps.unresolvedPings[0]?.id === nextProps.unresolvedPings[0]?.id &&
    prevProps.isResolving === nextProps.isResolving &&
    prevProps.resolvingPingId === nextProps.resolvingPingId
  );
});
