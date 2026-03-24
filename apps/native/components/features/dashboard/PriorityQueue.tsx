import type { Household, VulnerabilityFlag } from "@project-agap/api/supabase";

import { useQuery } from "@tanstack/react-query";
import { memo, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/app/empty-state";
import { VulnerabilityChips } from "@/components/ui/VulnerabilityChips";
import { haptics } from "@/services/haptics";
import { trpc, trpcClient } from "@/utils/trpc";

const vulnerabilityOrder: VulnerabilityFlag[] = [
  "pwd",
  "elderly",
  "infant",
  "pregnant",
  "solo_parent",
  "chronic_illness",
];

function getPriorityScore(flags: VulnerabilityFlag[]) {
  return flags.reduce((score, flag, index) => {
    const orderIndex = vulnerabilityOrder.indexOf(flag);
    return score + (orderIndex === -1 ? 0 : vulnerabilityOrder.length - orderIndex + index);
  }, 0);
}

const PriorityRow = memo(function PriorityRow({
  household,
  tanodName,
  onTanodNameChange,
  onDispatch,
  isDispatching,
}: {
  household: Household;
  tanodName: string;
  onTanodNameChange: (value: string) => void;
  onDispatch: () => void;
  isDispatching: boolean;
}) {
  return (
    <View className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4">
      <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
      <Text className="mt-1 text-sm text-slate-600">{household.purok}</Text>
      <View className="mt-3">
        <VulnerabilityChips flags={household.vulnerability_flags} tone="danger" />
      </View>
      <TextInput
        className="mt-3 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-base text-slate-900"
        onChangeText={onTanodNameChange}
        placeholder="Tanod name"
        value={tanodName}
      />
      <Pressable className="mt-3 rounded-2xl bg-rose-600 px-4 py-3" onPress={onDispatch}>
        <Text className="text-center font-semibold text-white">
          {isDispatching ? "Dispatching..." : "Dispatch"}
        </Text>
      </Pressable>
    </View>
  );
});

export function PriorityQueue({ barangayId }: { barangayId: string }) {
  const unaccountedQuery = useQuery(
    trpc.households.getUnaccounted.queryOptions(
      { barangayId },
      { enabled: Boolean(barangayId) },
    ),
  );
  const [dispatchedIds, setDispatchedIds] = useState<string[]>([]);
  const [dispatchingHouseholdId, setDispatchingHouseholdId] = useState<string | null>(null);
  const [tanodNames, setTanodNames] = useState<Record<string, string>>({});
  const households = useMemo(
    () =>
      (unaccountedQuery.data ?? [])
        .filter((household) => !dispatchedIds.includes(household.id))
        .filter((household) => household.vulnerability_flags.length > 0)
        .sort(
          (left, right) =>
            getPriorityScore(right.vulnerability_flags) - getPriorityScore(left.vulnerability_flags),
        ),
    [dispatchedIds, unaccountedQuery.data],
  );

  if (households.length === 0) {
    return (
      <View className="rounded-3xl bg-emerald-50 px-5 py-5">
        <Text className="text-base font-semibold text-emerald-700">✅ Lahat ay naaccounted for</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-xl font-semibold text-slate-950">Priority Queue</Text>
      {households.map((household) => (
        <PriorityRow
          key={household.id}
          household={household}
          tanodName={tanodNames[household.id] ?? ""}
          onTanodNameChange={(value) =>
            setTanodNames((current) => ({ ...current, [household.id]: value }))
          }
          onDispatch={() => {
            void (async () => {
              try {
                setDispatchingHouseholdId(household.id);
                await haptics.medium();
                await trpcClient.households.updateStatus.mutate({
                  householdId: household.id,
                  evacuationStatus: "welfare_check_dispatched" as never,
                });
                setDispatchedIds((current) => [...current, household.id]);
                await haptics.success();
              } catch {
                await haptics.error();
              } finally {
                setDispatchingHouseholdId(null);
              }
            })();
          }}
          isDispatching={dispatchingHouseholdId === household.id}
        />
      ))}
    </View>
  );
}
