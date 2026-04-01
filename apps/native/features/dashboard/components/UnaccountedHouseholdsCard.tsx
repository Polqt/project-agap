import { Text, View } from "react-native";

import { EmptyState, SectionCard } from "@/shared/components/ui";
import type { Household } from "@project-agap/api/supabase";

export function UnaccountedHouseholdsCard({ households }: { households: Household[] }) {
  return (
    <SectionCard
      title="Unaccounted households"
      subtitle="Use this list to prioritize outreach and welfare dispatch."
    >
      {households.length ? (
        households.slice(0, 5).map((household) => (
          <View key={household.id} className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
            <Text className="mt-1 text-sm text-slate-500">
              {household.purok} | {household.address}
            </Text>
          </View>
        ))
      ) : (
        <EmptyState
          title="Everyone is accounted for"
          description="Unaccounted households will show here when dashboard logic detects missing check-ins or pings."
        />
      )}
    </SectionCard>
  );
}
