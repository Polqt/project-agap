import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
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
import {
  fetchPhilippineEarthquakes,
  fetchGdacsAlerts,
  fetchPagasaBulletin,
  fetchPhCitiesAirQuality,
  fetchPhilippineNews,
  aqiLabel,
  wxCodeEmoji,
  type UsgsEarthquake,
  type GdacsAlert,
  type PagasaBulletin,
  type CityAirQuality,
  type PhNewsArticle,
} from "../services/hazardFeeds";

const LANG_STORAGE_KEY = "agap-alert-language";

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { isOnline } = useOfflineQueue();

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"alerto" | "mensahe" | "balita" | "nawawala">("alerto");
  const [language, setLanguage] = useState<AlertLanguage>("filipino");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    fullName: "",
    age: "",
    lastSeenLocation: "",
    description: "",
  });

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

  // ── Live hazard feeds (no API key needed) ──────────────────────────────────
  const earthquakesQuery = useQuery<UsgsEarthquake[]>({
    queryKey: ["usgs-earthquakes"],
    queryFn: fetchPhilippineEarthquakes,
    refetchInterval: 2 * 60_000,
    staleTime: 90_000,
  });

  const gdacsQuery = useQuery<GdacsAlert[]>({
    queryKey: ["gdacs-alerts"],
    queryFn: fetchGdacsAlerts,
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });

  const bulletinQuery = useQuery<PagasaBulletin | null>({
    queryKey: ["pagasa-bulletin"],
    queryFn: fetchPagasaBulletin,
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });

  const airQualityQuery = useQuery<CityAirQuality[]>({
    queryKey: ["ph-air-quality"],
    queryFn: fetchPhCitiesAirQuality,
    refetchInterval: 15 * 60_000,
    staleTime: 10 * 60_000,
  });

  const newsQuery = useQuery<PhNewsArticle[]>({
    queryKey: ["ph-news"],
    queryFn: fetchPhilippineNews,
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
    enabled: tab === "balita",
  });

  const missingPersonsQuery = useQuery(
    trpc.missingPersons.list.queryOptions(
      { statusFilter: "missing" },
      { enabled: Boolean(profile?.barangay_id), refetchInterval: 30_000 },
    ),
  );

  const reportMutation = useMutation(
    trpc.missingPersons.report.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["trpc", "missingPersons"] });
        setShowReportModal(false);
        setReportForm({ fullName: "", age: "", lastSeenLocation: "", description: "" });
      },
      onError: (err) => Alert.alert("Error", getErrorMessage(err)),
    }),
  );

  const markFoundMutation = useMutation(
    trpc.missingPersons.markFound.mutationOptions({
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["trpc", "missingPersons"] }),
      onError: (err) => Alert.alert("Error", getErrorMessage(err)),
    }),
  );

  const alerts = alertsQuery.data ?? [];
  const broadcasts = broadcastsQuery.data ?? [];
  const missingPersons = missingPersonsQuery.data ?? [];
  const earthquakes = earthquakesQuery.data ?? [];
  const gdacsAlerts = gdacsQuery.data ?? [];
  const bulletin = bulletinQuery.data ?? null;
  const airQualityData = airQualityQuery.data ?? [];
  const newsArticles = newsQuery.data ?? [];
  const isRefreshing =
    (alertsQuery.isFetching && !alertsQuery.isLoading) ||
    (broadcastsQuery.isFetching && !broadcastsQuery.isLoading) ||
    (missingPersonsQuery.isFetching && !missingPersonsQuery.isLoading) ||
    earthquakesQuery.isFetching ||
    gdacsQuery.isFetching ||
    newsQuery.isFetching;

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
    await Promise.allSettled([
      alertsQuery.refetch(),
      broadcastsQuery.refetch(),
      missingPersonsQuery.refetch(),
      earthquakesQuery.refetch(),
      gdacsQuery.refetch(),
      bulletinQuery.refetch(),
      airQualityQuery.refetch(),
      tab === "balita" ? newsQuery.refetch() : Promise.resolve(),
    ]);
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
          <Text className="text-[22px] font-bold text-slate-900">{t("alerts.title")}</Text>
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
              {t("common.offline")}
            </Text>
          </View>
        ) : null}

        {/* Segmented control: Alerto | Mensahe | Balita | Nawawala */}
        <View className="mx-5 mt-4 flex-row rounded-xl bg-slate-100 p-1">
          {(["alerto", "mensahe", "balita", "nawawala"] as const).map((tabKey) => (
            <Pressable
              key={tabKey}
              onPress={() => setTab(tabKey)}
              className={`flex-1 items-center rounded-lg py-2 ${
                tab === tabKey ? "bg-white shadow-sm" : ""
              }`}
            >
              <Ionicons
                name={
                  tabKey === "alerto"
                    ? "warning-outline"
                    : tabKey === "mensahe"
                      ? "chatbox-outline"
                      : tabKey === "balita"
                        ? "newspaper-outline"
                        : "search-outline"
                }
                size={13}
                color={tab === tabKey ? "#0f172a" : "#64748b"}
              />
              <Text
                className={`mt-0.5 text-[10px] font-semibold ${
                  tab === tabKey ? "text-slate-900" : "text-slate-500"
                }`}
                numberOfLines={1}
              >
                {tabKey === "alerto"
                  ? t("alerts.tabAlerts")
                  : tabKey === "mensahe"
                    ? t("alerts.tabMessages")
                    : tabKey === "balita"
                      ? t("alerts.tabNews")
                      : t("alerts.tabMissing")}
              </Text>
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
                  <Text className="text-[12px] text-rose-200">{t("alerts.activeSignal")}</Text>
                </View>
              </View>
            ) : null}

            {/* PAGASA Bulletin Banner */}
            {bulletin?.title ? (
              <View className="mx-5 mb-3 flex-row items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
                <Ionicons name="partly-sunny-outline" size={18} color="#d97706" />
                <View className="flex-1">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-600">PAGASA Bulletin</Text>
                  <Text className="mt-0.5 text-[13px] font-semibold text-slate-800" numberOfLines={2}>{bulletin.title}</Text>
                  {bulletin.effectivity ? (
                    <Text className="mt-0.5 text-[11px] text-amber-700">{bulletin.effectivity}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* GDACS International Alerts */}
            {gdacsAlerts.length > 0 ? (
              <View className="mx-5 mb-3">
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  GDACS International Alerts
                </Text>
                {gdacsAlerts.slice(0, 3).map((alert, i) => {
                  const levelColor =
                    alert.alertLevel === "Red"
                      ? { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "#e11d48" }
                      : alert.alertLevel === "Orange"
                        ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "#d97706" }
                        : { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "#059669" };
                  return (
                    <View key={`gdacs-${i}`} className={`mb-2 flex-row items-start gap-3 rounded-2xl border px-4 py-3 ${levelColor.bg} ${levelColor.border}`}>
                      <View className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: levelColor.dot }} />
                      <View className="flex-1">
                        <Text className={`text-[11px] font-bold uppercase tracking-wider ${levelColor.text}`}>
                          {alert.eventType} · {alert.alertLevel}
                        </Text>
                        <Text className="mt-0.5 text-[13px] font-semibold text-slate-800" numberOfLines={2}>{alert.title}</Text>
                        <Text className="mt-0.5 text-[11px] text-slate-500" numberOfLines={1}>{alert.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* USGS Earthquakes */}
            {earthquakes.length > 0 ? (
              <View className="mx-5 mb-3">
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  USGS — Recent Earthquakes
                </Text>
                {earthquakes.slice(0, 5).map((eq) => {
                  const isMajor = eq.magnitude >= 5.0;
                  const isModerate = eq.magnitude >= 4.0;
                  const bgColor = isMajor ? "bg-rose-50 border-rose-200" : isModerate ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200";
                  const magColor = isMajor ? "text-rose-700" : isModerate ? "text-amber-700" : "text-slate-600";
                  const date = new Date(eq.time);
                  const timeStr = date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
                  const dateStr = date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
                  return (
                    <View key={eq.id} className={`mb-2 flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${bgColor}`}>
                      <View className="items-center w-10">
                        <Text className={`text-[20px] font-black ${magColor}`}>{eq.magnitude.toFixed(1)}</Text>
                        <Text className="text-[9px] font-semibold text-slate-400">MAG</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[13px] font-semibold text-slate-900" numberOfLines={1}>{eq.place}</Text>
                        <View className="mt-0.5 flex-row items-center gap-2">
                          <Text className="text-[11px] text-slate-500">{dateStr} {timeStr}</Text>
                          <Text className="text-[11px] text-slate-400">· {eq.depth.toFixed(0)} km deep</Text>
                          {eq.tsunami === 1 ? (
                            <Text className="text-[10px] font-bold text-rose-600">⚠ TSUNAMI</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Air Quality & Weather */}
            {airQualityData.length > 0 ? (
              <View className="mx-5 mb-4">
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t("alerts.airQuality")}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-0">
                  <View className="flex-row gap-2">
                    {airQualityData.map((city) => {
                      const aq = aqiLabel(city.aqi);
                      return (
                        <View
                          key={city.city}
                          className="w-28 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                        >
                          <Text className="text-[13px] font-bold text-slate-900">{city.city}</Text>
                          {city.temperature != null ? (
                            <Text className="mt-0.5 text-[20px] font-black text-slate-800">
                              {wxCodeEmoji(city.weatherCode)} {Math.round(city.temperature)}°
                            </Text>
                          ) : null}
                          {city.aqi != null ? (
                            <View className={`mt-1.5 rounded-full px-2 py-0.5 self-start ${aq.bg}`}>
                              <Text className={`text-[10px] font-bold ${aq.text}`}>
                                AQI {city.aqi} · {aq.label}
                              </Text>
                            </View>
                          ) : null}
                          {city.pm25 != null ? (
                            <Text className="mt-1 text-[10px] text-slate-400">
                              PM2.5: {city.pm25.toFixed(1)}
                            </Text>
                          ) : null}
                          {city.windspeed != null ? (
                            <Text className="text-[10px] text-slate-400">
                              💨 {city.windspeed} km/h
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : null}

            {/* Barangay / PAGASA alerts header */}
            <View className="mx-5 mb-3 flex-row items-center justify-between">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Barangay Alerts ({alerts.length})
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
                  {t("alerts.noAlerts")}
                </Text>
                <Text className="mt-1 text-center text-[13px] text-slate-400">
                  {t("alerts.noAlertsBody")}
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
            {broadcasts.length === 0 ? (
              <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
                <Ionicons name="chatbox-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-[14px] font-semibold text-slate-600">
                  {t("alerts.noMessages")}
                </Text>
                <Text className="mt-1 text-center text-[13px] text-slate-400">
                  {t("alerts.noMessagesBody")}
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
        {/* BALITA TAB */}
        {tab === "balita" ? (
          <View className="mt-4">
            {newsQuery.isLoading ? (
              <View className="mx-5 items-center py-10">
                <Text className="text-[13px] text-slate-400">{t("common.loading")}</Text>
              </View>
            ) : newsArticles.length === 0 ? (
              <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
                <Ionicons name="newspaper-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-[14px] font-semibold text-slate-600">
                  {t("alerts.noNews")}
                </Text>
                <Text className="mt-1 text-center text-[13px] text-slate-400">
                  {t("alerts.noNewsBody")}
                </Text>
              </View>
            ) : null}

            {newsArticles.map((article, i) => {
              const pubDate = article.pubDate ? new Date(article.pubDate) : null;
              const timeStr = pubDate
                ? pubDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) +
                  " · " +
                  pubDate.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })
                : "";
              const sourceColor =
                article.source === "GMA News"
                  ? { bg: "bg-blue-100", text: "text-blue-700" }
                  : article.source === "Rappler"
                    ? { bg: "bg-rose-100", text: "text-rose-700" }
                    : { bg: "bg-emerald-100", text: "text-emerald-700" };
              return (
                <View
                  key={`news-${i}`}
                  className="mx-5 mb-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5"
                >
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <View className={`rounded-md px-2 py-0.5 ${sourceColor.bg}`}>
                      <Text className={`text-[10px] font-bold ${sourceColor.text}`}>
                        {article.source}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-slate-400">{timeStr}</Text>
                  </View>
                  <Text className="text-[14px] font-semibold leading-[19px] text-slate-900" numberOfLines={3}>
                    {article.title}
                  </Text>
                  {article.description ? (
                    <Text className="mt-1.5 text-[12px] leading-[17px] text-slate-500" numberOfLines={2}>
                      {article.description}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* NAWAWALA TAB */}
        {tab === "nawawala" ? (
          <View className="mt-4">
            <View className="mx-5 mb-3 flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                {missingPersons.length} {t("alerts.tabMissing").toLowerCase()}
              </Text>
              <Pressable
                onPress={() => setShowReportModal(true)}
                className="flex-row items-center gap-1 rounded-full bg-rose-600 px-3.5 py-1.5"
              >
                <Ionicons name="add" size={14} color="#fff" />
                <Text className="text-[12px] font-semibold text-white">{t("alerts.reportMissing")}</Text>
              </Pressable>
            </View>

            {missingPersons.length === 0 ? (
              <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
                <Ionicons name="search-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-[14px] font-semibold text-slate-600">
                  {t("alerts.noMissing")}
                </Text>
                <Text className="mt-1 text-center text-[13px] text-slate-400">
                  {t("alerts.noMissingBody")}
                </Text>
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
                        {person.age} taong gulang
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
                  <Text className="mt-1.5 text-[13px] leading-5 text-slate-700">
                    {person.description}
                  </Text>
                ) : null}

                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-[11px] text-slate-400">
                    {formatRelativeTime(person.created_at)}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        t("alerts.markFound"),
                        t("alerts.markFoundConfirm", { name: person.full_name }),
                        [
                          { text: t("common.cancel"), style: "cancel" },
                          {
                            text: t("alerts.markFoundYes"),
                            onPress: () => markFoundMutation.mutate({ id: person.id }),
                          },
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
        ) : null}
      </ScrollView>

      {/* Report Missing Person Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <Text className="text-[17px] font-bold text-slate-900">{t("alerts.reportMissingTitle")}</Text>
            <Pressable onPress={() => setShowReportModal(false)}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            <View className="py-4 gap-4">
              <View>
                <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">
                  {t("alerts.fullName")}
                </Text>
                <TextInput
                  value={reportForm.fullName}
                  onChangeText={(v) => setReportForm((f) => ({ ...f, fullName: v }))}
                  placeholder={t("alerts.namePlaceholder")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">
                  {t("alerts.age")}
                </Text>
                <TextInput
                  value={reportForm.age}
                  onChangeText={(v) => setReportForm((f) => ({ ...f, age: v }))}
                  placeholder={t("alerts.agePlaceholder")}
                  keyboardType="numeric"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">
                  {t("alerts.lastSeenLocation")}
                </Text>
                <TextInput
                  value={reportForm.lastSeenLocation}
                  onChangeText={(v) => setReportForm((f) => ({ ...f, lastSeenLocation: v }))}
                  placeholder={t("alerts.locationPlaceholder")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">
                  {t("alerts.description")}
                </Text>
                <TextInput
                  value={reportForm.description}
                  onChangeText={(v) => setReportForm((f) => ({ ...f, description: v }))}
                  placeholder={t("alerts.descriptionPlaceholder")}
                  multiline
                  numberOfLines={3}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                  placeholderTextColor="#94a3b8"
                  style={{ textAlignVertical: "top", minHeight: 80 }}
                />
              </View>

              <Pressable
                onPress={() => {
                  if (!reportForm.fullName.trim()) {
                    Alert.alert(t("common.error"), t("alerts.nameRequired"));
                    return;
                  }
                  reportMutation.mutate({
                    fullName: reportForm.fullName.trim(),
                    age: reportForm.age ? parseInt(reportForm.age, 10) : undefined,
                    lastSeenLocation: reportForm.lastSeenLocation.trim() || undefined,
                    description: reportForm.description.trim() || undefined,
                  });
                }}
                disabled={reportMutation.isPending}
                className={`items-center rounded-2xl py-4 ${
                  reportMutation.isPending ? "bg-slate-200" : "bg-rose-600"
                }`}
              >
                <Text className={`text-[15px] font-bold ${reportMutation.isPending ? "text-slate-400" : "text-white"}`}>
                  {reportMutation.isPending ? t("alerts.submitting") : t("alerts.submitReport")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
