import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { formatRelativeTime } from "@/shared/utils/date";

import {
  aqiLabel,
  wxCodeEmoji,
  type GdacsAlert,
  type UsgsEarthquake,
  type PagasaBulletin,
  type CityAirQuality,
} from "../services/hazardFeeds";
import {
  getAlertCopy,
  getAlertPreview,
  getAlertSignalLabel,
  getAlertSourceLabel,
  getAlertTone,
  isAlertStale,
} from "../utils";
import type { AlertLanguage } from "../types";
import type { Alert } from "@project-agap/api/supabase";

const PILL_TONE: Record<string, string> = {
  neutral: "bg-slate-200 text-slate-700",
  info: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

type Props = {
  alerts: Alert[];
  earthquakes: UsgsEarthquake[];
  gdacsAlerts: GdacsAlert[];
  bulletin: PagasaBulletin | null;
  airQualityData: CityAirQuality[];
  activeSignal: string | null;
  signalNumber: string | null;
  language: AlertLanguage;
  onChangeLanguage: (lang: AlertLanguage) => void;
};

export function HazardAlertsTab({
  alerts,
  earthquakes,
  gdacsAlerts,
  bulletin,
  airQualityData,
  activeSignal,
  signalNumber,
  language,
  onChangeLanguage,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="mt-4">
      {/* Typhoon signal card */}
      {signalNumber ? (
        <View className="mx-5 mb-4 flex-row items-center gap-4 rounded-2xl bg-rose-600 px-5 py-4">
          <Text className="text-[36px] font-bold text-white">{signalNumber}</Text>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-rose-100">PAGASA {activeSignal}</Text>
            <Text className="text-[12px] text-rose-200">{t("alerts.activeSignal")}</Text>
          </View>
        </View>
      ) : null}

      {/* PAGASA bulletin banner */}
      {bulletin?.title ? (
        <View className="mx-5 mb-3 flex-row items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Ionicons name="partly-sunny-outline" size={18} color="#d97706" />
          <View className="flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              PAGASA Bulletin
            </Text>
            <Text className="mt-0.5 text-[13px] font-semibold text-slate-800" numberOfLines={2}>
              {bulletin.title}
            </Text>
            {bulletin.effectivity ? (
              <Text className="mt-0.5 text-[11px] text-amber-700">{bulletin.effectivity}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* GDACS alerts */}
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
              <View
                key={`gdacs-${i}`}
                className={`mb-2 flex-row items-start gap-3 rounded-2xl border px-4 py-3 ${levelColor.bg} ${levelColor.border}`}
              >
                <View className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: levelColor.dot }} />
                <View className="flex-1">
                  <Text className={`text-[11px] font-bold uppercase tracking-wider ${levelColor.text}`}>
                    {alert.eventType} · {alert.alertLevel}
                  </Text>
                  <Text className="mt-0.5 text-[13px] font-semibold text-slate-800" numberOfLines={2}>
                    {alert.title}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-slate-500" numberOfLines={1}>
                    {alert.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* USGS earthquakes */}
      {earthquakes.length > 0 ? (
        <View className="mx-5 mb-3">
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            USGS — Recent Earthquakes
          </Text>
          {earthquakes.slice(0, 5).map((eq) => {
            const isMajor = eq.magnitude >= 5.0;
            const isModerate = eq.magnitude >= 4.0;
            const bgColor = isMajor
              ? "bg-rose-50 border-rose-200"
              : isModerate
                ? "bg-amber-50 border-amber-200"
                : "bg-slate-50 border-slate-200";
            const magColor = isMajor
              ? "text-rose-700"
              : isModerate
                ? "text-amber-700"
                : "text-slate-600";
            const date = new Date(eq.time);
            const timeStr = date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
            const dateStr = date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
            return (
              <View key={eq.id} className={`mb-2 flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${bgColor}`}>
                <View className="w-10 items-center">
                  <Text className={`text-[20px] font-black ${magColor}`}>{eq.magnitude.toFixed(1)}</Text>
                  <Text className="text-[9px] font-semibold text-slate-400">MAG</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-slate-900" numberOfLines={1}>
                    {eq.place}
                  </Text>
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

      {/* Air quality & weather */}
      {airQualityData.length > 0 ? (
        <View className="mx-5 mb-4">
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t("alerts.airQuality")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                      <View className={`mt-1.5 self-start rounded-full px-2 py-0.5 ${aq.bg}`}>
                        <Text className={`text-[10px] font-bold ${aq.text}`}>
                          AQI {city.aqi} · {aq.label}
                        </Text>
                      </View>
                    ) : null}
                    {city.pm25 != null ? (
                      <Text className="mt-1 text-[10px] text-slate-400">PM2.5: {city.pm25.toFixed(1)}</Text>
                    ) : null}
                    {city.windspeed != null ? (
                      <Text className="text-[10px] text-slate-400">💨 {city.windspeed} km/h</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* Official barangay + PAGASA ingested alerts */}
      <View className="mx-5 mb-3 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Opisyal na Alerto{alerts.length > 0 ? ` (${alerts.length})` : ""}
        </Text>
        <View className="flex-row rounded-full bg-slate-100 p-0.5">
          {(["filipino", "english"] as const).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => onChangeLanguage(lang)}
              className={`rounded-full px-3 py-1.5 ${language === lang ? "bg-white shadow-sm" : ""}`}
            >
              <Text className={`text-[11px] font-semibold ${language === lang ? "text-slate-900" : "text-slate-500"}`}>
                {lang === "filipino" ? "Filipino" : "English"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {alerts.length === 0 ? (
        <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
          <Ionicons name="shield-checkmark-outline" size={32} color="#94a3b8" />
          <Text className="mt-2 text-[14px] font-semibold text-slate-600">{t("alerts.noAlerts")}</Text>
          <Text className="mt-1 text-center text-[13px] text-slate-400">{t("alerts.noAlertsBody")}</Text>
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
            onPress={() => router.push({ pathname: "/alert-detail", params: { id: alert.id } })}
            className="mx-5 mb-3"
            style={{ opacity: stale ? 0.45 : 1 }}
          >
            <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <View className="flex-row items-center gap-2">
                <Text className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${PILL_TONE[tone] ?? PILL_TONE.neutral}`}>
                  {sourceName} · {alert.hazard_type}
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
                <Text className="text-[11px] text-slate-400">{formatRelativeTime(alert.issued_at)}</Text>
                {stale ? (
                  <Text className="text-[11px] font-medium text-slate-400">stale</Text>
                ) : (
                  <Text className="text-[11px] font-medium text-blue-600">Ibahagi &gt;</Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
