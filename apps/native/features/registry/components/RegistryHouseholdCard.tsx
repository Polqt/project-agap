import { Text, View } from "react-native";

import { AppButton, Pill } from "@/shared/components/ui";

import type { EvacuationStatus, Household } from "@project-agap/api/supabase";

const statusActions: Array<{
  value: EvacuationStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
}> = [
  { value: "safe", label: "Mark safe", variant: "primary" },
  { value: "need_help", label: "Mark need help", variant: "danger" },
  { value: "checked_in", label: "Mark checked in", variant: "secondary" },
];

type Props = {
  household: Household;
  isUpdating: boolean;
  onUpdateStatus: (householdId: string, evacuationStatus: EvacuationStatus) => void;
};

export function RegistryHouseholdCard({ household, isUpdating, onUpdateStatus }: Props) {
  return (
    <View className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
          <Text className="mt-1 text-sm text-slate-500">
            {household.purok} | {household.address}
          </Text>
          <Text className="mt-2 text-sm text-slate-600">
            {household.total_members} member{household.total_members > 1 ? "s" : ""} |{" "}
            {household.phone_number || "No phone number"}
          </Text>
        </View>
        <View className="items-end gap-2">
          <Pill label={household.evacuation_status.replaceAll("_", " ")} tone="info" />
          {household.is_sms_only ? <Pill label="SMS only" tone="warning" /> : null}
        </View>
      </View>
      <View className="mt-4 gap-3">
        {statusActions.map((action) => (
          <AppButton
            key={action.value}
            label={action.label}
            onPress={() => onUpdateStatus(household.id, action.value)}
            variant={action.variant}
            loading={isUpdating}
          />
        ))}
      </View>
    </View>
  );
}
