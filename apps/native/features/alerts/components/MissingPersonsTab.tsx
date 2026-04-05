import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";

import { formatRelativeTime } from "@/shared/utils/date";

type MissingPerson = {
  id: string;
  full_name: string;
  age: number | null;
  last_seen_location: string | null;
  description: string | null;
  created_at: string;
};

type Props = {
  missingPersons: MissingPerson[];
  onReportPress: () => void;
  markFoundMutation: UseMutationResult<unknown, unknown, { id: string }, unknown>;
};

export function MissingPersonsTab({ missingPersons, onReportPress, markFoundMutation }: Props) {
  const { t } = useTranslation();

  return (
    <View className="mt-4">
      <View className="mx-5 mb-3 flex-row items-center justify-between">
        <Text className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
          {missingPersons.length} {t("alerts.tabMissing").toLowerCase()}
        </Text>
        <Pressable
          onPress={onReportPress}
          className="flex-row items-center gap-1 rounded-full bg-rose-600 px-3.5 py-1.5"
        >
          <Ionicons name="add" size={14} color="#fff" />
          <Text className="text-[12px] font-semibold text-white">{t("alerts.reportMissing")}</Text>
        </Pressable>
      </View>

      {missingPersons.length === 0 ? (
        <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
          <Ionicons name="search-outline" size={32} color="#94a3b8" />
          <Text className="mt-2 text-[14px] font-semibold text-slate-600">{t("alerts.noMissing")}</Text>
          <Text className="mt-1 text-center text-[13px] text-slate-400">{t("alerts.noMissingBody")}</Text>
        </View>
      ) : null}

      {missingPersons.map((person) => (
        <View
          key={person.id}
          className="mx-5 mb-3 rounded-2xl border border-rose-100 bg-white px-4 py-4"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-rose-500" />
                <Text className="text-[15px] font-bold text-slate-900">{person.full_name}</Text>
              </View>
              {person.age != null ? (
                <Text className="mt-0.5 text-[12px] text-slate-500">
                  {person.age} {t("alerts.ageUnit")}
                </Text>
              ) : null}
            </View>
            <Text className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              {t("alerts.missingStatus")}
            </Text>
          </View>

          {person.last_seen_location ? (
            <View className="mt-2.5 flex-row items-start gap-1.5">
              <Ionicons name="location-outline" size={13} color="#94a3b8" />
              <Text className="flex-1 text-[12px] text-slate-500">
                {t("alerts.lastSeen")}: {person.last_seen_location}
              </Text>
            </View>
          ) : null}

          {person.description ? (
            <Text className="mt-1.5 text-[13px] leading-5 text-slate-700">{person.description}</Text>
          ) : null}

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-[11px] text-slate-400">{formatRelativeTime(person.created_at)}</Text>
            <Pressable
              onPress={() => {
                Alert.alert(
                  t("alerts.markFound"),
                  t("alerts.markFoundConfirm", { name: person.full_name }),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    { text: t("alerts.markFoundYes"), onPress: () => markFoundMutation.mutate({ id: person.id }) },
                  ],
                );
              }}
              className="rounded-full bg-emerald-100 px-3 py-1.5"
            >
              <Text className="text-[12px] font-semibold text-emerald-700">{t("alerts.markFound")}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
