import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { formatRelativeTime } from "@/shared/utils/date";
import { useAuth } from "@/shared/hooks/useAuth";

type Broadcast = {
  id: string;
  message: string;
  message_filipino: string | null;
  target_purok: string | null;
  sent_at: string;
};

type Props = {
  broadcasts: Broadcast[];
};

export function BroadcastsTab({ broadcasts }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuth();

  if (broadcasts.length === 0) {
    return (
      <View className="mt-4 mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
        <Ionicons name="chatbox-outline" size={32} color="#94a3b8" />
        <Text className="mt-2 text-[14px] font-semibold text-slate-600">{t("alerts.noMessages")}</Text>
        <Text className="mt-1 text-center text-[13px] text-slate-400">{t("alerts.noMessagesBody")}</Text>
      </View>
    );
  }

  return (
    <View className="mt-4">
      {broadcasts.map((broadcast) => (
        <View
          key={broadcast.id}
          className="mx-5 mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <Text className="text-[11px] text-slate-400">
            Bgy. {profile?.purok ?? ""} Official · {formatRelativeTime(broadcast.sent_at)}
          </Text>
          <Text className="mt-2 text-[14px] font-semibold leading-5 text-slate-900">
            {broadcast.message}
          </Text>
          {broadcast.message_filipino ? (
            <Text className="mt-1.5 text-[13px] leading-5 text-slate-600">
              {broadcast.message_filipino}
            </Text>
          ) : null}
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row gap-1.5">
              {broadcast.target_purok ? (
                <Text className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {broadcast.target_purok}
                </Text>
              ) : (
                <Text className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Buong Barangay
                </Text>
              )}
            </View>
            <Text className="text-[11px] font-medium text-blue-600">Ibahagi</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
