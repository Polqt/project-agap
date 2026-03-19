import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";

import { haptics } from "@/services/haptics";
import { trpc, trpcClient } from "@/utils/trpc";

export function NeedsReportsPanel() {
  const reportsQuery = useQuery(trpc.needsReports.list.queryOptions());
  const [totalEvacuees, setTotalEvacuees] = useState("0");
  const [foodPacks, setFoodPacks] = useState("0");
  const [waterLiters, setWaterLiters] = useState("0");
  const [blankets, setBlankets] = useState("0");
  const [medicalCases, setMedicalCases] = useState("");
  const [notes, setNotes] = useState("");
  const [needsMedicine, setNeedsMedicine] = useState(false);

  return (
    <FlatList
      className="flex-1"
      data={reportsQuery.data ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View className="gap-5">
          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase tracking-[3px] text-blue-700">Reports</Text>
            <Text className="text-4xl font-semibold text-slate-950">Needs reports</Text>
            <Text className="text-base leading-7 text-slate-600">
              Submit and review evacuation center needs.
            </Text>
          </View>
          <View className="gap-3 rounded-[28px] bg-white px-5 py-5">
            <TextInput
              className="rounded-2xl border border-slate-200 px-4 py-4"
              keyboardType="number-pad"
              onChangeText={setTotalEvacuees}
              placeholder="Total evacuees"
              value={totalEvacuees}
            />
            <TextInput
              className="rounded-2xl border border-slate-200 px-4 py-4"
              keyboardType="number-pad"
              onChangeText={setFoodPacks}
              placeholder="Food packs"
              value={foodPacks}
            />
            <TextInput
              className="rounded-2xl border border-slate-200 px-4 py-4"
              keyboardType="number-pad"
              onChangeText={setWaterLiters}
              placeholder="Water liters"
              value={waterLiters}
            />
            <TextInput
              className="rounded-2xl border border-slate-200 px-4 py-4"
              keyboardType="number-pad"
              onChangeText={setBlankets}
              placeholder="Blankets"
              value={blankets}
            />
            <Pressable
              className={`rounded-2xl px-4 py-4 ${needsMedicine ? "bg-blue-600" : "bg-slate-100"}`}
              onPress={() => setNeedsMedicine((current) => !current)}
            >
              <Text className={`text-center font-semibold ${needsMedicine ? "text-white" : "text-slate-900"}`}>
                Needs medicine
              </Text>
            </Pressable>
            <TextInput
              className="rounded-2xl border border-slate-200 px-4 py-4"
              multiline
              onChangeText={setMedicalCases}
              placeholder="Medical cases"
              value={medicalCases}
            />
            <TextInput
              className="rounded-2xl border border-slate-200 px-4 py-4"
              multiline
              onChangeText={setNotes}
              placeholder="Notes"
              value={notes}
            />
            <Pressable
              className="rounded-2xl bg-slate-950 px-4 py-4"
              onPress={() =>
                void (async () => {
                  await haptics.medium();
                  await trpcClient.needsReports.submit.mutate({
                    total_evacuees: Number(totalEvacuees) || 0,
                    needs_food_packs: Number(foodPacks) || 0,
                    needs_water_liters: Number(waterLiters) || 0,
                    needs_blankets: Number(blankets) || 0,
                    needs_medicine: needsMedicine,
                    medical_cases: medicalCases || undefined,
                    notes: notes || undefined,
                  });
                  await reportsQuery.refetch();
                  await haptics.success();
                })()
              }
            >
              <Text className="text-center font-semibold text-white">Submit report</Text>
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View className="rounded-2xl bg-white px-4 py-4">
          <Text className="text-base font-semibold text-slate-950">
            {item.total_evacuees} evacuees
          </Text>
          <Text className="mt-1 text-sm text-slate-600">
            Food: {item.needs_food_packs} • Water: {item.needs_water_liters} • Blankets: {item.needs_blankets}
          </Text>
          <Text className="mt-1 text-sm text-slate-500">{item.status}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View className="h-3" />}
    />
  );
}
