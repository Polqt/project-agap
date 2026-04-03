import { Pressable, Text, View } from "react-native";

import { RegistryDetailCard } from "./RegistryDetailCard";
import { computeRiskScore, RISK_COLORS } from "@/shared/utils/riskScore";

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

function statusConfig(status: Household["evacuation_status"]) {
  switch (status) {
    case "safe":
    case "checked_in":
      return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
    case "need_help":
      return { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" };
    case "unknown":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
    case "welfare_check_dispatched":
      return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };
  }
}

function getBadges(household: Household) {
  const badges: string[] = [];

  if (household.vulnerability_flags.includes("elderly")) badges.push("Senior");
  if (household.vulnerability_flags.includes("infant")) badges.push("Minor");
  if (household.vulnerability_flags.includes("pwd")) badges.push("PWD");
  if (household.vulnerability_flags.includes("pregnant")) badges.push("Pregnant");

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
  const status = statusConfig(household.evacuation_status);
  const statusLabel = (household.evacuation_status ?? "unknown").replaceAll("_", " ");
  const risk = computeRiskScore(household);
  const riskColors = RISK_COLORS[risk.level];

  return (
    <View
      className={`overflow-hidden rounded-2xl border ${isExpanded ? "border-slate-300 bg-white" : "border-slate-200 bg-white"}`}
    >
      <Pressable
        onPress={() => onToggle(household.id)}
        className="px-4 py-3.5"
      >
        {/* Top row: name + status */}
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[15px] font-semibold text-slate-900" numberOfLines={1}>
            {household.household_head}
          </Text>

          <View className={`flex-row items-center gap-1.5 rounded-md px-2 py-1 ${status.bg}`}>
            <View className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            <Text className={`text-[11px] font-semibold capitalize ${status.text}`}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Subtitle: purok + members + risk badge */}
        <View className="mt-1 flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-[13px] text-slate-400">
            {household.purok} &middot; {household.total_members} member{household.total_members === 1 ? "" : "s"}
          </Text>
          <View className={`flex-row items-center gap-1 rounded px-1.5 py-0.5 ${riskColors.bg}`}>
            <View className={`h-1.5 w-1.5 rounded-full ${riskColors.dot}`} />
            <Text className={`text-[10px] font-bold ${riskColors.text}`}>{risk.label}</Text>
          </View>
        </View>

        {/* Badges row */}
        {badges.length > 0 || household.is_sms_only ? (
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            {badges.map((badge) => (
              <View key={badge} className="rounded-md bg-slate-100 px-2 py-0.5">
                <Text className="text-[11px] font-medium text-slate-600">{badge}</Text>
              </View>
            ))}
            {household.is_sms_only ? (
              <View className="rounded-md bg-blue-50 px-2 py-0.5">
                <Text className="text-[11px] font-medium text-blue-600">SMS-only</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {/* Expanded detail */}
      {isExpanded ? (
        <View className="border-t border-slate-100 px-4 pb-4 pt-3">
          <Text className="text-[13px] leading-5 text-slate-500">
            {household.address}
            {household.phone_number ? ` \u00B7 ${household.phone_number}` : ""}
          </Text>
          {household.notes ? (
            <Text className="mt-1.5 text-[13px] leading-5 text-slate-400 italic">
              {household.notes}
            </Text>
          ) : null}

          <RegistryDetailCard
            household={expandedHousehold}
            isAssigningWelfare={isAssigningWelfare}
            isUpdating={isUpdating}
            onAssignWelfare={onAssignWelfare}
            onUpdateStatus={onUpdateStatus}
          />
        </View>
      ) : null}
    </View>
  );
}
