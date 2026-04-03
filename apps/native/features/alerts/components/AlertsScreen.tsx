import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listBroadcastsForBarangay } from "@/features/broadcast/services/broadcasts";
import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/date";
import { getErrorMessage } from "@/shared/utils/errors";
import { setHasUnreadAlert } from "@/stores/app-shell-store";

import {
  getAlertCopy,
  getAlertPreview,
  getAlertSignalLabel,
  getAlertSourceLabel,
  getAlertTone,
  isAlertStale,
} from "../utils";
import type { AlertLanguage } from "../types";

const LANG_STORAGE_KEY = "agap-alert-language";

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { isOnline } = useOfflineQueue();

  const [tab, setTab] = useState<"alerto" | "mensahe">("alerto");
  const [language, setLanguage] = useState<AlertLanguage>("filipino");

  // Persist language preference
  useEffect(() => {
    void AsyncStorage.getItem(LANG_STORAGE_KEY).then((v) => {
      if (v === "english" || v === "filipino") setLanguage(v);
    });
  }, []);

  const changeLanguage = useCallback((lang: AlertLanguage) => {
    setLanguage(lang);
    void AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  }, []);

  // Mark alerts as read when visiting
  useEffect(() => {
    setHasUnreadAlert(false);
  }, []);

  const alertsQuery = useQuery(
    trpc.alerts.listActive.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const broadcastsQuery = useQuery({
    queryKey: ["broadcasts", "resident", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    queryFn: async () => listBroadcastsForBarangay(profile!.barangay_id!),
  });

  const alerts = alertsQuery.data ?? [];
  const broadcasts = broadcastsQuery.data ?? [];
  const isRefreshing =
    (alertsQuery.isFetching && !alertsQuery.isLoading) ||
    (broadcastsQuery.isFetching && !broadcastsQuery.isLoading);

  // Find highest active signal
  const activeSignal = alerts.reduce<string | null>((best, alert) => {
    const label = getAlertSignalLabel(alert.signal_level);
    if (!label) return best;
    if (!best) return label;
    // Simple numeric comparison for "Signal No. X"
    const numA = parseInt(best.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(label.replace(/\D/g, ""), 10) || 0;
    return numB > numA ? label : best;
  }, null);

  const signalNumber = activeSignal ? activeSignal.replace(/\D/g, "") : null;

  async function refresh() {
    await Promise.allSettled([alertsQuery.refetch(), broadcastsQuery.refetch()]);
  }

  const pillTone: Record<string, string> = {
    neutral: "bg-slate-200 text-slate-700",
    info: "bg-blue-100 text-blue-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5">
          <Text className="text-[22px] font-bold text-slate-900">Mga Alerto</Text>
          <Pressable
            onPress={() => void refresh()}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={isRefreshing ? "#94a3b8" : "#334155"}
            />
          </Pressable>
        </View>

        {/* Offline banner */}
        {!isOnline ? (
          <View className="mx-5 mt-3 flex-row items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2">
            <View className="h-2 w-2 rounded-full bg-amber-500" />
            <Text className="flex-1 text-[12px] font-medium text-amber-700">
              Offline \u2014 showing cached data
            </Text>
          </View>
        ) : null}

        {/* Segmented control: Alerto | Mensahe */}
        <View className="mx-5 mt-4 flex-row rounded-xl bg-slate-100 p-1">
          {(["alerto", "mensahe"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 items-center rounded-lg py-2.5 ${
                tab === t ? "bg-white shadow-sm" : ""
              }`}
            >
              <View className="flex-row items-center gap-1.5">
                <Ionicons
                  name={t === "alerto" ? "warning-outline" : "chatbox-outline"}
                  size={14}
                  color={tab === t ? "#0f172a" : "#64748b"}
                />
                <Text
                  className={`text-[13px] font-semibold ${
                    tab === t ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {t === "alerto" ? "Alerto" : "Mensahe"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ALERTO TAB */}
        {tab === "alerto" ? (
          <View className="mt-4">
            {/* Signal level card */}
            {signalNumber ? (
              <View className="mx-5 mb-4 flex-row items-center gap-4 rounded-2xl bg-rose-600 px-5 py-4">
                <Text className="text-[36px] font-bold text-white">{signalNumber}</Text>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-rose-100">
                    PAGASA {activeSignal}
                  </Text>
                  <Text className="text-[12px] text-rose-200">Active typhoon signal</Text>
                </View>
              </View>
            ) : null}

            {/* Bilingual toggle */}
            <View className="mx-5 mb-3 flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
              </Text>
              <View className="flex-row rounded-full bg-slate-100 p-0.5">
                {(["filipino", "english"] as const).map((lang) => (
                  <Pressable
                    key={lang}
                    onPress={() => changeLanguage(lang)}
                    className={`rounded-full px-3 py-1.5 ${
                      language === lang ? "bg-white shadow-sm" : ""
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-semibold ${
                        language === lang ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {lang === "filipino" ? "Filipino" : "English"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Alert cards */}
            {alerts.length === 0 ? (
              <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
                <Ionicons name="shield-checkmark-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-[14px] font-semibold text-slate-600">
                  No active hazard alerts
                </Text>
                <Text className="mt-1 text-center text-[13px] text-slate-400">
                  PAGASA, PHIVOLCS, or your barangay will post here.
                </Text>
              </View>
            ) : null}

            {alerts.map((alert) => {
              const stale = isAlertStale(alert.issued_at);
              const copy = getAlertCopy(alert, language);
              const preview = getAlertPreview(alert, language);
              const signalLabel = getAlertSignalLabel(alert.signal_level);
              const sourceName = getAlertSourceLabel(alert.source);
              const tone = getAlertTone(alert.severity);

              return (
                <Pressable
                  key={alert.id}
                  onPress={() =>
                    router.push({ pathname: "/alert-detail", params: { id: alert.id } })
                  }
                  className="mx-5 mb-3"
                  style={{ opacity: stale ? 0.45 : 1 }}
                >
                  <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    {/* Source + time row */}
                    <View className="flex-row items-center gap-2">
                      <Text
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${pillTone[tone] ?? pillTone.neutral}`}
                      >
                        {sourceName} \u00b7 {alert.hazard_type}
                      </Text>
                      {signalLabel ? (
                        <Text className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          {signalLabel}
                        </Text>
                      ) : null}
                    </View>

                    <Text className="mt-2 text-[15px] font-semibold text-slate-900" numberOfLines={2}>
                      {copy.title}
                    </Text>

                    <Text className="mt-1.5 text-[13px] leading-5 text-slate-600" numberOfLines={3}>
                      {preview}
                    </Text>

                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="text-[11px] text-slate-400">
                        {formatRelativeTime(alert.issued_at)}
                      </Text>
                      {stale ? (
                        <Text className="text-[11px] font-medium text-slate-400">stale</Text>
                      ) : null}
                      {!stale ? (
                        <Text className="text-[11px] font-medium text-blue-600">Ibahagi &gt;</Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* MENSAHE TAB */}
        {tab === "mensahe" ? (
          <View className="mt-4">
            <View className="mx-5 mb-3">
              <Text className="text-[13px] text-slate-500">
                Mga mensahe mula sa inyong Barangay Official
              </Text>
            </View>

            {broadcasts.length === 0 ? (
              <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
                <Ionicons name="chatbox-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-[14px] font-semibold text-slate-600">
                  Walang mensahe
                </Text>
                <Text className="mt-1 text-center text-[13px] text-slate-400">
                  Official broadcasts will appear here.
                </Text>
              </View>
            ) : null}

            {broadcasts.map((broadcast) => (
              <View
                key={broadcast.id}
                className="mx-5 mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <Text className="text-[11px] text-slate-400">
                  Bgy. {profile?.purok ?? ""} Official \u00b7{" "}
                  {formatRelativeTime(broadcast.sent_at)}
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
        ) : null}
      </ScrollView>
    </View>
  );
}
