import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { setHasUnreadAlert } from "@/stores/app-shell-store";

import type { AlertLanguage } from "../types";
import { useAlertsData } from "../hooks/useAlertsData";
import { HazardAlertsTab } from "./HazardAlertsTab";
import { BroadcastsTab } from "./BroadcastsTab";
import { NewsTab } from "./NewsTab";
import { MissingPersonsTab } from "./MissingPersonsTab";
import { ReportMissingModal } from "./ReportMissingModal";

const LANG_STORAGE_KEY = "agap-alert-language";
type Tab = "alerto" | "mensahe" | "balita" | "nawawala";

const TAB_CONFIG: Array<{ key: Tab; icon: string; labelKey: string }> = [
  { key: "alerto",   icon: "warning-outline",   labelKey: "alerts.tabAlerts" },
  { key: "mensahe",  icon: "chatbox-outline",    labelKey: "alerts.tabMessages" },
  { key: "balita",   icon: "newspaper-outline",  labelKey: "alerts.tabNews" },
  { key: "nawawala", icon: "search-outline",     labelKey: "alerts.tabMissing" },
];

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isOnline } = useOfflineQueue();

  const [tab, setTab] = useState<Tab>("alerto");
  const [language, setLanguage] = useState<AlertLanguage>("filipino");
  const [showReportModal, setShowReportModal] = useState(false);

  const data = useAlertsData(tab === "balita");

  // Persist alert language preference
  useEffect(() => {
    void AsyncStorage.getItem(LANG_STORAGE_KEY).then((v) => {
      if (v === "english" || v === "filipino") setLanguage(v as AlertLanguage);
    });
  }, []);

  const handleLanguageChange = useCallback((lang: AlertLanguage) => {
    setLanguage(lang);
    void AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  }, []);

  // Clear unread badge on mount
  useEffect(() => {
    setHasUnreadAlert(false);
  }, []);

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
            onPress={() => void data.refresh()}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
          >
            <Ionicons name="refresh-outline" size={18} color={data.isRefreshing ? "#94a3b8" : "#334155"} />
          </Pressable>
        </View>

        {/* Offline banner */}
        {!isOnline ? (
          <View className="mx-5 mt-3 flex-row items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2">
            <View className="h-2 w-2 rounded-full bg-amber-500" />
            <Text className="flex-1 text-[12px] font-medium text-amber-700">{t("common.offline")}</Text>
          </View>
        ) : null}

        {/* Tab bar */}
        <View className="mx-5 mt-4 flex-row rounded-xl bg-slate-100 p-1">
          {TAB_CONFIG.map(({ key, icon, labelKey }) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className={`flex-1 items-center rounded-lg py-2 ${tab === key ? "bg-white shadow-sm" : ""}`}
            >
              <Ionicons
                name={icon as never}
                size={13}
                color={tab === key ? "#0f172a" : "#64748b"}
              />
              <Text
                className={`mt-0.5 text-[10px] font-semibold ${tab === key ? "text-slate-900" : "text-slate-500"}`}
                numberOfLines={1}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        {tab === "alerto" ? (
          <HazardAlertsTab
            alerts={data.alerts}
            earthquakes={data.earthquakes}
            gdacsAlerts={data.gdacsAlerts}
            bulletin={data.bulletin}
            airQualityData={data.airQualityData}
            activeSignal={data.activeSignal}
            signalNumber={data.signalNumber}
            language={language}
            onChangeLanguage={handleLanguageChange}
          />
        ) : tab === "mensahe" ? (
          <BroadcastsTab broadcasts={data.broadcasts} />
        ) : tab === "balita" ? (
          <NewsTab articles={data.newsArticles} isLoading={data.newsIsLoading} />
        ) : (
          <MissingPersonsTab
            missingPersons={data.missingPersons}
            onReportPress={() => setShowReportModal(true)}
            markFoundMutation={data.markFoundMutation}
          />
        )}
      </ScrollView>

      <ReportMissingModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportMutation={data.reportMutation}
      />
    </View>
  );
}
