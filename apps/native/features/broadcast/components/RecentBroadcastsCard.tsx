import { Text, View } from "react-native";

import { EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import { formatDateTime } from "@/shared/utils/date";
import type { Broadcast } from "@project-agap/api/supabase";

export function RecentBroadcastsCard({ broadcasts }: { broadcasts: Broadcast[] }) {
  return (
    <SectionCard
      title="Recent broadcasts"
      subtitle="This becomes the operational audit trail for sent messaging."
    >
      {broadcasts.length ? (
        broadcasts.map((broadcast) => (
          <View key={broadcast.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">{broadcast.message}</Text>
                <Text className="mt-2 text-sm text-slate-500">
                  {broadcast.target_purok ? `Scoped to ${broadcast.target_purok}` : "Whole barangay"}
                </Text>
              </View>
              <Pill label={broadcast.broadcast_type.replace("_", " ").toUpperCase()} tone="info" />
            </View>
            <Text className="mt-3 text-xs uppercase tracking-[1.2px] text-slate-400">
              Sent {formatDateTime(broadcast.sent_at)}
            </Text>
          </View>
        ))
      ) : (
        <EmptyState
          title="No broadcasts yet"
          description="Once you send operational messages, they will appear here for follow-up and review."
        />
      )}
    </SectionCard>
  );
}
