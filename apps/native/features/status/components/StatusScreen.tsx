import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";

import { haptics } from "@/services/haptics";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { queryClient, trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { formatRelativeTime } from "@/shared/utils/date";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { appShellStore, setLastStatusPing } from "@/stores/app-shell-store";

import { ProxyPingSection } from "./ProxyPingSection";

export function StatusScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { isOnline, pendingActions, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const lastPingPreview = useStore(appShellStore, (s) => s.lastStatusPing);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const householdQuery = useQuery(
    trpc.households.getMine.queryOptions(undefined, {
      enabled: Boolean(profile?.barangay_id),
    }),
  );

  const latestPingQuery = useQuery(
    trpc.statusPings.getLatestMine.queryOptions(undefined, {
      enabled: Boolean(profile?.barangay_id),
      refetchInterval: 60_000,
    }),
  );
  const latestPingQueryKey = trpc.statusPings.getLatestMine.queryKey();

  const submitMutation = useMutation(
    trpc.statusPings.submit.mutationOptions({
      onSuccess: (result) => {
        queryClient.setQueryData(latestPingQueryKey, result);
        latestPingQuery.refetch();
        setLastStatusPing({
          status: result.status,
          createdAt: Date.parse(result.pinged_at),
          source: "server",
        });
        setFeedback(t("status.statusSent"));
        setMessage("");
      },
    }),
  );

  async function handleSubmit(status: "safe" | "need_help") {
    const payload = {
      householdId: householdQuery.data?.id ?? undefined,
      status,
      message: message.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);

    if (status === "need_help") {
      void haptics.heavy().catch(() => {});
    } else {
      void haptics.light().catch(() => {});
    }

    if (!isOnline) {
      await queueAction(createQueuedAction("status-ping.submit", payload));
      setLastStatusPing({ status, createdAt: Date.now(), source: "queue" });
      setFeedback(t("common.queued"));
      setMessage("");
      return;
    }

    try {
      await submitMutation.mutateAsync(payload);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("status-ping.submit", payload));
        setLastStatusPing({ status, createdAt: Date.now(), source: "queue" });
        setFeedback("Connection dropped. Queued locally.");
        setMessage("");
        return;
      }
      setFeedback(getErrorMessage(error, "Unable to submit your status."));
    }
  }

  const latestPing = latestPingQuery.data;
  const queuedCount = pendingActions.filter((a) => a.type === "status-ping.submit").length;

  const lastStatusLabel =
    latestPing?.status === "safe"
      ? t("status.iAmSafe")
      : latestPing?.status === "need_help"
        ? t("status.iNeedHelp")
        : null;

  const lastStatusTone =
    latestPing?.status === "need_help" ? "rose" : "emerald";

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Greeting */}
        <View className="px-5">
          <Text className="text-[15px] text-slate-500">
            Kamusta ka, {profile?.full_name?.split(" ")[0] ?? "Resident"}?
          </Text>
          {profile?.purok ? (
            <Text className="mt-0.5 text-[13px] text-slate-400">
              Bgy. {/* barangay name will come from profile context */}
              {profile.purok}
            </Text>
          ) : null}
        </View>

        {/* Offline banner */}
        {!isOnline ? (
          <View className="mx-5 mt-3 flex-row items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2">
            <Ionicons name="cloud-offline-outline" size={14} color="#d97706" />
            <Text className="flex-1 text-[12px] font-medium text-amber-700">
              {t("common.offline")}{queuedCount > 0 ? ` · ${queuedCount} ping${queuedCount > 1 ? "s" : ""} queued` : ""}
            </Text>
          </View>
        ) : null}

        {/* Last status card */}
        {latestPing ? (
          <View className="mx-5 mt-4">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              {t("status.lastPing")}
            </Text>
            <View
              className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                lastStatusTone === "rose"
                  ? "border-rose-200 bg-rose-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  lastStatusTone === "rose" ? "bg-rose-200" : "bg-emerald-200"
                }`}
              >
                <Ionicons
                  name={lastStatusTone === "rose" ? "alert-circle" : "shield-checkmark"}
                  size={16}
                  color={lastStatusTone === "rose" ? "#e11d48" : "#059669"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-slate-900">{lastStatusLabel}</Text>
                <Text className="text-[12px] text-slate-500">
                  {formatRelativeTime(latestPing.pinged_at)} · synced
                </Text>
              </View>
            </View>
          </View>
        ) : lastPingPreview ? (
          <View className="mx-5 mt-4">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              {t("status.lastPing")}
            </Text>
            <View className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-amber-200">
                <Ionicons name="time-outline" size={16} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-slate-900">
                  {lastPingPreview.status === "safe" ? t("status.iAmSafe") : t("status.iNeedHelp")}
                </Text>
                <Text className="text-[12px] text-amber-700">
                  {formatRelativeTime(lastPingPreview.createdAt)} · queued
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Hero action buttons */}
        <View className="mt-5 gap-3 px-5">
          {/* SAFE */}
          <Pressable
            onPress={() => void handleSubmit("safe")}
            disabled={submitMutation.isPending}
            className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-emerald-50 px-5 active:opacity-80"
            style={{ minHeight: 88 }}
          >
            <View className="flex-1 flex-row items-center gap-4 py-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-200">
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-bold text-slate-900">{t("status.iAmSafe")}</Text>
                <Text className="text-[13px] text-slate-500">{t("status.safeDescription")}</Text>
              </View>
            </View>
          </Pressable>

          {/* NEED HELP */}
          <Pressable
            onPress={() => void handleSubmit("need_help")}
            disabled={submitMutation.isPending}
            className="overflow-hidden rounded-3xl border-2 border-rose-200 bg-rose-50 px-5 active:opacity-80"
            style={{ minHeight: 88 }}
          >
            <View className="flex-1 flex-row items-center gap-4 py-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-200">
                <Ionicons name="alert-circle" size={24} color="#e11d48" />
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-bold text-slate-900">{t("status.iNeedHelp")}</Text>
                <Text className="text-[13px] text-slate-500">{t("status.needHelpDescription")}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Feedback */}
        {feedback ? (
          <View className="mx-5 mt-3 rounded-xl bg-slate-100 px-4 py-2.5">
            <Text className="text-[13px] text-slate-600">{feedback}</Text>
          </View>
        ) : null}

        {/* Divider */}
        <View className="mx-5 mt-6 border-t border-slate-100" />

        {/* Proxy ping section */}
        <ProxyPingSection />
      </ScrollView>
    </View>
  );
}
