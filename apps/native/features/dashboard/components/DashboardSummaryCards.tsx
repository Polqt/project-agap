import { View } from "react-native";

import { SectionCard, StatCard } from "@/shared/components/ui";
import type { DashboardSummary } from "@project-agap/api/supabase";

export function DashboardSummaryCards({ summary }: { summary: DashboardSummary | undefined }) {
  return (
    <SectionCard
      title="Live KPIs"
      subtitle="Counts refresh every 60 seconds to stay resilient even on weak connections."
    >
      <View className="flex-row flex-wrap gap-3">
        <StatCard label="Safe" value={summary?.safe_count ?? 0} tone="success" />
        <StatCard label="Need help" value={summary?.need_help_count ?? 0} tone="danger" />
        <StatCard label="Checked in" value={summary?.checked_in_count ?? 0} tone="info" />
        <StatCard label="Unaccounted" value={summary?.unaccounted_count ?? 0} tone="warning" />
        {(summary?.sms_replied_count ?? 0) > 0 ? (
          <StatCard label="SMS replies" value={summary?.sms_replied_count ?? 0} tone="warning" />
        ) : null}
      </View>
    </SectionCard>
  );
}
