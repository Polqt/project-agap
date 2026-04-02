import { Text, View } from "react-native";

import { EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import { formatRelativeTime } from "@/shared/utils/date";
import type { WelfareDispatchQueueItem } from "@project-agap/api/supabase";

type Props = {
  items: WelfareDispatchQueueItem[];
};

export function WelfareDispatchCard({ items }: Props) {
  return (
    <SectionCard
      title="Welfare dispatch queue"
      subtitle="Households with an active field visit assignment. Shows assigned official (Tanod / field)."
    >
      {items.length ? (
        items.map((row) => (
          <View key={row.id} className="mb-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">{row.household_head}</Text>
                <Text className="mt-1 text-sm text-slate-600">
                  {row.purok}
                  {row.assignee_full_name ? ` · Assigned: ${row.assignee_full_name}` : " · Unassigned"}
                </Text>
                {row.welfare_assigned_at ? (
                  <Text className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                    {formatRelativeTime(row.welfare_assigned_at)}
                  </Text>
                ) : null}
              </View>
              <Pill label="Dispatch" tone="warning" />
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          title="No active welfare dispatches"
          description="Assign welfare visits from the registry to surface households here for the command view."
        />
      )}
    </SectionCard>
  );
}
