import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";

const statusActions = [
  { value: "safe" as const, label: "Mark safe", tone: "success" as const },
  { value: "need_help" as const, label: "Mark need help", tone: "danger" as const },
  { value: "checked_in" as const, label: "Mark checked in", tone: "info" as const },
];

export function RegistryPanel() {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");

  const listQuery = useQuery(
    trpc.households.list.queryOptions(
      {
        barangayId: profile?.barangay_id ?? undefined,
        page: 1,
        pageSize: 40,
      },
      {
        enabled: Boolean(profile?.barangay_id),
      },
    ),
  );

  const searchQuery = useQuery(
    trpc.households.search.queryOptions(
      {
        barangayId: profile?.barangay_id ?? undefined,
        query,
      },
      {
        enabled: Boolean(profile?.barangay_id && query.trim().length >= 2),
      },
    ),
  );

  const updateStatusMutation = useMutation(
    trpc.households.updateStatus.mutationOptions({
      onSuccess: () => {
        listQuery.refetch();
        if (query.trim().length >= 2) {
          searchQuery.refetch();
        }
      },
    }),
  );

  const households = useMemo(() => {
    return query.trim().length >= 2 ? searchQuery.data ?? [] : listQuery.data?.items ?? [];
  }, [listQuery.data?.items, query, searchQuery.data]);

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.2 Household registry"
        title="Household registry"
        description="Search the registry, inspect household status, and update accountability markers for your barangay."
      />

      <SectionCard title="Search" subtitle="Full-text search runs across household head, purok, and address.">
        <TextField
          label="Search households"
          value={query}
          onChangeText={setQuery}
          placeholder="Household head, purok, or address"
        />
      </SectionCard>

      <SectionCard title="Registry list" subtitle="Residents and SMS-only households live in the same accountability surface.">
        {households.length ? (
          households.map((household) => (
            <View key={household.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {household.purok} • {household.address}
                  </Text>
                  <Text className="mt-2 text-sm text-slate-600">
                    {household.total_members} member{household.total_members > 1 ? "s" : ""} • {household.phone_number || "No phone number"}
                  </Text>
                </View>
                <View className="items-end gap-2">
                  <Pill label={household.evacuation_status.replace("_", " ")} tone="info" />
                  {household.is_sms_only ? <Pill label="SMS only" tone="warning" /> : null}
                </View>
              </View>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {statusActions.map((action) => (
                  <AppButton
                    key={action.value}
                    label={action.label}
                    onPress={() =>
                      void updateStatusMutation.mutateAsync({
                        householdId: household.id,
                        evacuationStatus: action.value,
                      })
                    }
                    variant={action.value === "need_help" ? "danger" : action.value === "checked_in" ? "secondary" : "primary"}
                    loading={updateStatusMutation.isPending && updateStatusMutation.variables?.householdId === household.id}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No households found"
            description="When residents finish onboarding or officials register households, they will appear here."
          />
        )}
      </SectionCard>
    </View>
  );
}
