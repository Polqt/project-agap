import { Text, View } from "react-native";

import { AppButton } from "@/shared/components/ui";

import type { EvacuationStatus, HouseholdWithMembers } from "@project-agap/api/supabase";

type Props = {
  household: HouseholdWithMembers | null;
  isAssigningWelfare: boolean;
  isUpdating: boolean;
  onAssignWelfare: (householdId: string) => void;
  onUpdateStatus: (householdId: string, evacuationStatus: EvacuationStatus) => void;
};

const statusActions: Array<{
  label: string;
  value: EvacuationStatus;
  variant: "primary" | "secondary" | "danger";
}> = [
  { label: "Mark safe", value: "safe", variant: "primary" },
  { label: "Mark checked in", value: "checked_in", variant: "secondary" },
  { label: "Mark need help", value: "need_help", variant: "danger" },
];

export function RegistryDetailCard({
  household,
  isAssigningWelfare,
  isUpdating,
  onAssignWelfare,
  onUpdateStatus,
}: Props) {
  if (!household) {
    return (
      <View className="rounded-[22px] bg-white px-4 py-4">
        <Text className="text-sm leading-6 text-slate-500">Loading household details...</Text>
      </View>
    );
  }

  return (
    <View className="mt-4 gap-4">
      <View className="rounded-[22px] bg-white px-4 py-4">
        <Text className="text-sm font-semibold text-slate-950">Members</Text>
        {household.household_members.length ? (
          <View className="mt-3 gap-2">
            {household.household_members.map((member) => (
              <View key={member.id} className="rounded-[18px] bg-slate-100 px-3 py-3">
                <Text className="text-sm font-semibold text-slate-950">{member.full_name}</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {member.age !== null ? `${member.age} years old` : "Age not recorded"}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-2 text-sm text-slate-500">No household members saved yet.</Text>
        )}
      </View>

      <View className="rounded-[22px] bg-white px-4 py-4">
        <Text className="text-sm font-semibold text-slate-950">Field actions</Text>
        <View className="mt-3 gap-3">
          <AppButton
            label="Assign welfare visit"
            onPress={() => onAssignWelfare(household.id)}
            variant="secondary"
            loading={isAssigningWelfare}
            disabled={isUpdating}
          />
          {statusActions.map((action) => (
            <AppButton
              key={action.value}
              label={action.label}
              onPress={() => onUpdateStatus(household.id, action.value)}
              variant={action.variant}
              loading={isUpdating}
              disabled={isAssigningWelfare}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
