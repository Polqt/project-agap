import { Text, View } from "react-native";

import { HouseholdList } from "@/components/features/dashboard/HouseholdList";
import { useHouseholdList } from "@/hooks/useHouseholdList";
import { useAuth } from "@/providers/AuthProvider";

export function RegistryPanel() {
  const { profile } = useAuth();
  const householdsQuery = useHouseholdList(profile?.barangay_id, 100);

  return (
    <View className="flex-1 gap-5 px-6 py-6">
      <View className="gap-3">
        <Text className="text-sm font-semibold uppercase tracking-[3px] text-blue-700">Registry</Text>
        <Text className="text-4xl font-semibold text-slate-950">Household list</Text>
        <Text className="text-base leading-7 text-slate-600">
          Review the full household registry for your barangay.
        </Text>
      </View>
      <HouseholdList
        households={householdsQuery.data?.items ?? []}
        isLoading={householdsQuery.isLoading}
        title="All households"
      />
    </View>
  );
}
