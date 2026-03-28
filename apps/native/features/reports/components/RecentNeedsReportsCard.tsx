import { Text, View } from "react-native";

import { EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import { formatDateTime } from "@/shared/utils/date";
import type { NeedsReport } from "@project-agap/api/supabase";

export function RecentNeedsReportsCard({ reports }: { reports: NeedsReport[] }) {
  return (
    <SectionCard
      title="Recent reports"
      subtitle="Latest shelter supply reports for this barangay."
    >
      {reports.length ? (
        reports.map((report) => (
          <View key={report.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">
                  {report.total_evacuees} evacuees
                </Text>
                <Text className="mt-2 text-sm text-slate-500">
                  Food: {report.needs_food_packs} packs | Water: {report.needs_water_liters} L | Blankets: {report.needs_blankets}
                </Text>
              </View>
              <Pill label={report.status.toUpperCase()} tone="warning" />
            </View>
            <Text className="mt-3 text-xs uppercase tracking-[1.2px] text-slate-400">
              Submitted {formatDateTime(report.submitted_at)}
            </Text>
          </View>
        ))
      ) : (
        <EmptyState
          title="No needs reports yet"
          description="Submit a report when shelters need food packs, water, blankets, medicine, or escalation."
        />
      )}
    </SectionCard>
  );
}
