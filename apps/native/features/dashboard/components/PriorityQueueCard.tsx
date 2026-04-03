import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import { formatRelativeTime } from "@/shared/utils/date";
import type { StatusPing } from "@project-agap/api/supabase";

type Props = {
  unresolvedPings: StatusPing[];
  isResolving: boolean;
  resolvingPingId?: string;
  onResolve: (pingId: string) => void;
};

export function PriorityQueueCard({
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
              <Pill
                label={ping.channel.toUpperCase()}
                tone={ping.status === "need_help" ? "danger" : "success"}
              />
            </View>
            <View className="mt-4">
              <AppButton
                label="Mark resolved"
                onPress={() => onResolve(ping.id)}
                loading={isResolving && resolvingPingId === ping.id}
              />
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          title="No unresolved pings"
          description="Need-help pings will appear here as soon as residents or SMS-only households report them."
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
