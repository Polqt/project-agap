import { Pressable, Text, View } from "react-native";

import { RegistryDetailCard } from "./RegistryDetailCard";

import type { EvacuationStatus, Household, HouseholdWithMembers } from "@project-agap/api/supabase";

type Props = {
  expandedHousehold: HouseholdWithMembers | null;
  household: Household;
  isAssigningWelfare: boolean;
  isExpanded: boolean;
  isUpdating: boolean;
  onAssignWelfare: (householdId: string) => void;
  onToggle: (householdId: string) => void;
  onUpdateStatus: (householdId: string, evacuationStatus: EvacuationStatus) => void;
};

function statusTone(status: Household["evacuation_status"]) {
  switch (status) {
    case "safe":
    case "checked_in":
      return "bg-emerald-100 text-emerald-700";
    case "need_help":
      return "bg-rose-100 text-rose-700";
    case "unknown":
      return "bg-amber-100 text-amber-700";
    case "welfare_check_dispatched":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-200 text-slate-600";
  }
}

function getBadges(household: Household) {
  const badges: string[] = [];

  if (household.vulnerability_flags.includes("elderly")) {
    badges.push("Senior");
  }
  if (household.vulnerability_flags.includes("infant")) {
    badges.push("Minor");
  }
  if (household.vulnerability_flags.includes("pwd")) {
    badges.push("PWD");
  }
  if (household.vulnerability_flags.includes("pregnant")) {
    badges.push("Pregnant");
  }

  return badges;
}

export function RegistryHouseholdCard({
  expandedHousehold,
  household,
  isAssigningWelfare,
  isExpanded,
  isUpdating,
  onAssignWelfare,
  onToggle,
  onUpdateStatus,
}: Props) {
  const badges = getBadges(household);

  return (
    <View className="rounded-[28px] bg-slate-100 px-4 py-4">
      <Pressable onPress={() => onToggle(household.id)}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
            <Text className="mt-1 text-sm text-slate-500">
              {household.purok} / {household.total_members} member{household.total_members === 1 ? "" : "s"}
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1 ${statusTone(household.evacuation_status)}`}>
            <Text className="text-xs font-semibold capitalize">
              {(household.evacuation_status ?? "unknown").replaceAll("_", " ")}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          {badges.map((badge) => (
            <View key={badge} className="rounded-full bg-white px-3 py-1">
              <Text className="text-xs font-semibold text-slate-700">{badge}</Text>
            </View>
          ))}
          {household.is_sms_only ? (
            <View className="rounded-full bg-white px-3 py-1">
              <Text className="text-xs font-semibold text-slate-700">SMS-only</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {isExpanded ? (
        <>
          <View className="mt-4 h-px bg-slate-200" />
          <View className="mt-4">
            <Text className="text-sm leading-6 text-slate-600">
              {household.address}
              {household.phone_number ? ` / ${household.phone_number}` : ""}
            </Text>
            {household.notes ? <Text className="mt-2 text-sm leading-6 text-slate-500">{household.notes}</Text> : null}
          </View>

          <RegistryDetailCard
            household={expandedHousehold}
            isAssigningWelfare={isAssigningWelfare}
            isUpdating={isUpdating}
            onAssignWelfare={onAssignWelfare}
            onUpdateStatus={onUpdateStatus}
          />
        </>
      ) : null}
    </View>
  );
}
