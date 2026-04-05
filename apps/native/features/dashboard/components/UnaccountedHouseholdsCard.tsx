import { Text, View } from "react-native";

import { EmptyState, SectionCard } from "@/shared/components/ui";
import { computeRiskScore, RISK_COLORS } from "@/shared/utils/riskScore";
import type { Household } from "@project-agap/api/supabase";

export function UnaccountedHouseholdsCard({ households }: { households: Household[] }) {
  const sorted = [...households].sort(
    (a, b) => computeRiskScore(b).score - computeRiskScore(a).score,
  );

  return (
    <SectionCard
      title="Unaccounted households"
      subtitle="Sorted by risk priority. Highest-risk households first."
    >
      {sorted.length ? (
        sorted.slice(0, 8).map((household) => {
          const risk = computeRiskScore(household);
          const colors = RISK_COLORS[risk.level];
          return (
            <View key={household.id} className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-[15px] font-semibold text-slate-900" numberOfLines={1}>
                  {household.household_head}
                </Text>
                <View className={`flex-row items-center gap-1 rounded px-1.5 py-0.5 ${colors.bg}`}>
                  <View className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                  <Text className={`text-[10px] font-bold ${colors.text}`}>{risk.label}</Text>
                </View>
              </View>
              <Text className="mt-1 text-[13px] text-slate-500">
                {household.purok} · {household.address}
              </Text>
              {household.vulnerability_flags?.length > 0 ? (
                <Text className="mt-0.5 text-[12px] text-slate-400">
                  {household.vulnerability_flags.join(", ")}
                </Text>
              ) : null}
            </View>
          );
        })
      ) : (
        <EmptyState
          title="Everyone is accounted for"
          description="Unaccounted households will show here when dashboard logic detects missing check-ins or pings."
        />
      )}
    </SectionCard>
  );
}
