import { Pressable, Text, View } from "react-native";

import { Pill } from "@/shared/components/ui";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/date";

import {
  getAlertPreview,
  getAlertSignalLabel,
  getAlertSourceLabel,
  getAlertTone,
  isAlertStale,
} from "../utils";

import type { Alert } from "@project-agap/api/supabase";

type Props = {
  alert: Alert;
  onPress: () => void;
};

export function AlertCard({ alert, onPress }: Props) {
  const signalLabel = getAlertSignalLabel(alert.signal_level);
  const stale = isAlertStale(alert.issued_at);
  const preview = getAlertPreview(alert, "english");

  return (
    <Pressable
      onPress={onPress}
      className={`mx-5 mt-5 rounded-[28px] border px-5 py-5 shadow-sm ${stale ? "border-slate-200 bg-slate-100 opacity-60" : "border-slate-200 bg-white"}`}
    >
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-slate-950" numberOfLines={2}>
            {alert.title}
          </Text>
          <Text className="text-sm leading-6 text-slate-500">
            {alert.hazard_type} | {formatRelativeTime(alert.issued_at)}
          </Text>
        </View>
        <View className="items-end gap-2">
          <Pill label={alert.severity.toUpperCase()} tone={getAlertTone(alert.severity)} />
          {signalLabel ? <Pill label={signalLabel} tone="warning" /> : null}
        </View>
      </View>

      <Text className="mt-4 text-sm leading-6 text-slate-600" numberOfLines={4}>
        {preview}
      </Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pill label={getAlertSourceLabel(alert.source)} tone="neutral" />
        {stale ? <Pill label="Older than 72h" tone="neutral" /> : null}
      </View>

      <Text className="mt-3 text-xs uppercase tracking-[1.2px] text-slate-400">
        Issued {formatDateTime(alert.issued_at)}
      </Text>
    </Pressable>
  );
}
