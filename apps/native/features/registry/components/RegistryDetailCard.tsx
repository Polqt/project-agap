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
      <View className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3">
        <Text className="text-[13px] text-slate-400">Loading household details...</Text>
      </View>
    );
  }

  return (
    <View className="mt-3 gap-3">
      {/* Members */}
      <View className="rounded-xl bg-slate-50 p-3">
        <Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Members
        </Text>
        {household.household_members.length ? (
          <View className="mt-2 gap-1.5">
            {household.household_members.map((member) => (
              <View key={member.id} className="flex-row items-center justify-between py-1.5">
                <Text className="text-[13px] font-medium text-slate-800">{member.full_name}</Text>
                <Text className="text-[12px] text-slate-400">
                  {member.age !== null ? `${member.age} yrs` : "—"}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-2 text-[13px] text-slate-400">No members recorded.</Text>
        )}
      </View>

      {/* Actions */}
      <View className="gap-2">
        <AppButton
          label="Assign welfare visit"
          onPress={() => onAssignWelfare(household.id)}
          variant="ghost"
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
  );
}
