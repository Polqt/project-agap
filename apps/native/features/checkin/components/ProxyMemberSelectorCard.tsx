import { Pressable, Text, View } from "react-native";

import { EmptyState, Pill, SectionCard } from "@/shared/components/ui";

import type { HouseholdMember, HouseholdWithMembers } from "@project-agap/api/supabase";

type Props = {
  household: HouseholdWithMembers | null;
  members: HouseholdMember[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  isLoading: boolean;
};

export function ProxyMemberSelectorCard({
  household,
  members,
  selectedMemberIds,
  onToggleMember,
  isLoading,
}: Props) {
  if (!household) {
    return null;
  }

  return (
    <SectionCard
      title="Additional members present"
      subtitle={`Select the members from ${household.household_head}'s household who are also present at the center.`}
      right={<Pill label={`${selectedMemberIds.length} selected`} tone="info" />}
    >
      {isLoading ? <Text className="text-sm text-slate-500">Loading household members...</Text> : null}

      {!isLoading && !members.length ? (
        <EmptyState
          title="No additional members listed"
          description="This household has no registered additional members yet, so you can continue with the household-level proxy check-in."
        />
      ) : null}

      <View className="gap-3">
        {members.map((member) => {
          const isSelected = selectedMemberIds.includes(member.id);

          return (
            <Pressable
              key={member.id}
              onPress={() => onToggleMember(member.id)}
              className={`rounded-2xl border px-4 py-4 ${isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
            >
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">{member.full_name}</Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {member.age !== null ? `${member.age} years old` : "Age not listed"}
                  </Text>
                </View>
                <Pill label={isSelected ? "Present" : "Not marked"} tone={isSelected ? "success" : "neutral"} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </SectionCard>
  );
}
