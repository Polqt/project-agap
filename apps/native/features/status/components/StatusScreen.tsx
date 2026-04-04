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
      },
    }),
  );

  async function handleSubmit(status: "safe" | "need_help") {
    setFeedback(null);

    if (status === "need_help") {
      void haptics.heavy().catch(() => {});
    } else {
      void haptics.light().catch(() => {});
    }

    const payload = {
      householdId: householdQuery.data?.id ?? undefined,
      status,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    if (!isOnline) {
      await queueAction(createQueuedAction("status-ping.submit", payload));
      setLastStatusPing({ status, createdAt: Date.now(), source: "queue" });
      setFeedback(t("common.queued"));
      return;
    }

    try {
      await submitMutation.mutateAsync(payload);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("status-ping.submit", payload));
        setLastStatusPing({ status, createdAt: Date.now(), source: "queue" });
        setFeedback(t("common.queued"));
        return;
      }
      setFeedback(getErrorMessage(error, "Unable to submit your status."));
    }
  }

  const latestPing = latestPingQuery.data;
  const queuedCount = pendingActions.filter((a) => a.type === "status-ping.submit").length;
  const firstName = profile?.full_name?.split(" ")[0] ?? "Resident";

  const lastStatusLabel =
    latestPing?.status === "safe"
      ? t("status.iAmSafe")
      : latestPing?.status === "need_help"
        ? t("status.iNeedHelp")
        : null;

  const lastStatusTone = latestPing?.status === "need_help" ? "rose" : "emerald";

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Greeting header ── */}
        <View className="px-5 pb-6">
          <Text className="text-[13px] font-medium text-slate-400 uppercase tracking-wider">
            {t("status.title")}
          </Text>
          <Text className="mt-1 text-[28px] font-bold text-slate-900">
            {firstName}
          </Text>
          {profile?.purok ? (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name="location-outline" size={13} color="#94a3b8" />
              <Text className="text-[13px] text-slate-400">{profile.purok}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Offline banner ── */}
        {!isOnline ? (
          <View className="mx-5 mb-4 flex-row items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <Ionicons name="cloud-offline-outline" size={16} color="#d97706" />
            <Text className="flex-1 text-[13px] font-medium text-amber-700">
              {t("common.offline")}
              {queuedCount > 0 ? ` · ${queuedCount} ping${queuedCount > 1 ? "s" : ""} queued` : ""}
            </Text>
          </View>
        ) : null}

        {/* ── Last ping status ── */}
        {latestPing ? (
          <View className="mx-5 mb-5">
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("status.lastPing")}
            </Text>
            <View
              className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 ${
                lastStatusTone === "rose"
                  ? "border-rose-200 bg-rose-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  lastStatusTone === "rose" ? "bg-rose-200" : "bg-emerald-200"
                }`}
              >
                <Ionicons
                  name={lastStatusTone === "rose" ? "alert-circle" : "shield-checkmark"}
                  size={20}
                  color={lastStatusTone === "rose" ? "#e11d48" : "#059669"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-slate-900">{lastStatusLabel}</Text>
                <Text className="text-[12px] text-slate-500">
                  {formatRelativeTime(latestPing.pinged_at)} · synced
                </Text>
              </View>
              <View
                className={`h-2 w-2 rounded-full ${
                  lastStatusTone === "rose" ? "bg-rose-400" : "bg-emerald-400"
                }`}
              />
            </View>
          </View>
        ) : lastPingPreview ? (
          <View className="mx-5 mb-5">
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("status.lastPing")}
            </Text>
            <View className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-200">
                <Ionicons name="time-outline" size={20} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-slate-900">
                  {lastPingPreview.status === "safe" ? t("status.iAmSafe") : t("status.iNeedHelp")}
                </Text>
                <Text className="text-[12px] text-amber-700">
                  {formatRelativeTime(lastPingPreview.createdAt)} · queued
                </Text>
              </View>
              <View className="h-2 w-2 rounded-full bg-amber-400" />
            </View>
          </View>
        ) : null}

        {/* ── Action buttons ── */}
        <View className="px-5 gap-3">
          {/* SAFE */}
          <Pressable
            onPress={() => void handleSubmit("safe")}
            disabled={submitMutation.isPending}
            className="overflow-hidden rounded-3xl bg-emerald-500 shadow-sm active:opacity-80"
            style={{ minHeight: 96 }}
          >
            <View className="flex-row items-center gap-4 px-6 py-5">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-400">
                <Ionicons name="shield-checkmark" size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-black text-white tracking-tight">
                  {t("status.iAmSafe")}
                </Text>
                <Text className="mt-0.5 text-[13px] text-emerald-100">
                  {t("status.safeDescription")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#a7f3d0" />
            </View>
          </Pressable>

          {/* NEED HELP */}
          <Pressable
            onPress={() => void handleSubmit("need_help")}
            disabled={submitMutation.isPending}
            className="overflow-hidden rounded-3xl bg-rose-500 shadow-sm active:opacity-80"
            style={{ minHeight: 96 }}
          >
            <View className="flex-row items-center gap-4 px-6 py-5">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-rose-400">
                <Ionicons name="alert-circle" size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-black text-white tracking-tight">
                  {t("status.iNeedHelp")}
                </Text>
                <Text className="mt-0.5 text-[13px] text-rose-100">
                  {t("status.needHelpDescription")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fecdd3" />
            </View>
          </Pressable>
        </View>

        {/* ── Feedback toast ── */}
        {feedback ? (
          <View className="mx-5 mt-4 flex-row items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text className="text-[13px] font-medium text-slate-700">{feedback}</Text>
          </View>
        ) : null}

        {/* ── Divider ── */}
        <View className="mx-5 mt-8 border-t border-slate-200" />

        {/* ── Proxy ping section ── */}
        <ProxyPingSection />
      </ScrollView>
    </View>
  );
}
