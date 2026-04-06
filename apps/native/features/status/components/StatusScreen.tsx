import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { haptics } from "@/services/haptics";
import {
  getOfflineHousehold,
  getOfflineLatestStatusPing,
  getOfflineResidentAccess,
  getOfflineScope,
  saveOfflineLatestStatusPing,
  syncOfflineDatasets,
} from "@/services/offlineData";
import { readOfflineSyncTimestamp } from "@/services/offlineDataDb";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { runWithNetworkResilience } from "@/services/networkResilience";
import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { formatRelativeTime } from "@/shared/utils/date";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { getLatestSyncedTimestamp } from "@/shared/utils/offline-freshness";
import { LastSyncedBadge } from "@/shared/components/last-synced-badge";
import { appShellStore, setLastStatusPing } from "@/stores/app-shell-store";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

import { ProxyPingSection } from "./ProxyPingSection";

export function StatusScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, isWeakConnection, pendingActions, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const lastPingPreview = useStore(appShellStore, (s) => s.lastStatusPing);
  const [feedback, setFeedback] = useState<string | null>(null);
  const offlineScope = getOfflineScope(profile);

  const householdQuery = useQuery({
    queryKey: ["offline", "status-household", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineHousehold(offlineScope!.scopeId),
  });

  const residentAccessQuery = useQuery({
    queryKey: ["offline", "resident-access", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineResidentAccess(offlineScope!.scopeId),
  });

  const latestPingQuery = useQuery({
    queryKey: ["offline", "latest-status-ping", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineLatestStatusPing(offlineScope!.scopeId),
  });

  const syncTimestampQuery = useQuery({
    queryKey: ["offline", "sync-timestamp-status", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => {
      if (!offlineScope) return null;
      // Get latest sync from any of the status-related datasets
      const timestamps = await Promise.all([
        readOfflineSyncTimestamp(offlineScope.scopeId, "latest-status-ping"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "household"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "resident-access"),
      ]);
      return getLatestSyncedTimestamp(...timestamps);
    },
  });

  async function syncStatusDatasets() {
    if (!offlineScope) {
      return;
    }

    await syncOfflineDatasets(offlineScope, ["latestStatusPing", "household", "residentAccess"]);
    bumpOfflineDataGeneration();
  }

  const submitMutation = useMutation(
    trpc.statusPings.submit.mutationOptions({
      onSuccess: async (result) => {
        if (offlineScope) {
          await saveOfflineLatestStatusPing(offlineScope.scopeId, result);
          bumpOfflineDataGeneration();
        }
        setLastStatusPing({
          status: result.status,
          createdAt: Date.parse(result.pinged_at),
          source: "server",
        });
        await syncStatusDatasets();
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
    const queuedAction = createQueuedAction("status-ping.submit", payload, offlineScope);
    const livePayload = queuedAction.payload;

    if (!isOnline) {
      await queueAction(queuedAction);
      if (offlineScope) {
        await saveOfflineLatestStatusPing(offlineScope.scopeId, {
          id: livePayload.clientMutationId ?? `offline-status-${Date.now()}`,
          barangay_id: offlineScope.barangayId,
          resident_id: offlineScope.profileId,
          household_id: livePayload.householdId ?? null,
          status,
          channel: "app",
          latitude: livePayload.latitude ?? null,
          longitude: livePayload.longitude ?? null,
          message: null,
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
          pinged_at: new Date().toISOString(),
        });
        bumpOfflineDataGeneration();
      }
      setLastStatusPing({ status, createdAt: Date.now(), source: "queue" });
      setFeedback(t("common.queued"));
      return;
    }

    try {
      await runWithNetworkResilience(
        "Resident status ping",
        () => submitMutation.mutateAsync(livePayload),
        { isWeakConnection },
      );
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(queuedAction);
        if (offlineScope) {
          await saveOfflineLatestStatusPing(offlineScope.scopeId, {
            id: livePayload.clientMutationId ?? `offline-status-${Date.now()}`,
            barangay_id: offlineScope.barangayId,
            resident_id: offlineScope.profileId,
            household_id: livePayload.householdId ?? null,
            status,
            channel: "app",
            latitude: livePayload.latitude ?? null,
            longitude: livePayload.longitude ?? null,
            message: null,
            is_resolved: false,
            resolved_by: null,
            resolved_at: null,
            pinged_at: new Date().toISOString(),
          });
          bumpOfflineDataGeneration();
        }
        setLastStatusPing({ status, createdAt: Date.now(), source: "queue" });
        setFeedback(
          isWeakConnection
            ? "Weak signal prevented live delivery, so the ping was stored for automatic retry."
            : t("common.queued"),
        );
        return;
      }
      setFeedback(getErrorMessage(error, "Unable to submit your status."));
    }
  }

  const latestPing = latestPingQuery.data;
  const queuedCount = pendingActions.filter((a) => a.type === "status-ping.submit").length;
  const firstName = profile?.full_name?.split(" ")[0] ?? "Resident";
  const residentPingEnabled = residentAccessQuery.data?.residentPingEnabled ?? true;
  const emergencyActionDisabled = submitMutation.isPending || residentAccessQuery.isLoading;

  const lastStatusLabel =
    latestPing?.status === "safe"
      ? t("status.iAmSafe")
      : latestPing?.status === "need_help"
        ? t("status.iNeedHelp")
        : null;

  const lastStatusTone = latestPing?.status === "need_help" ? "rose" : "emerald";
  const latestPingIsQueued =
    Boolean(latestPing?.id?.startsWith("offline-status-")) ||
    (queuedCount > 0 && lastPingPreview?.source === "queue");

  return (
    <View className="flex-1 bg-slate-50">
      <View
        pointerEvents="box-none"
        className="absolute right-5 z-10"
        style={{ top: insets.top + 12 }}
      >
        <Pressable
          onPress={() => router.push("/profile")}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm"
        >
          {profile?.full_name ? (
            <Text className="text-[15px] font-bold text-slate-900">
              {profile.full_name.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Ionicons name="person-outline" size={20} color="#0f172a" />
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 76, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pb-6">
          <Text className="text-[13px] font-medium uppercase tracking-wider text-slate-400">
            {t("status.title")}
          </Text>
          <Text className="mt-1 text-[28px] font-bold text-slate-900">{firstName}</Text>
          {profile?.purok ? (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name="location-outline" size={13} color="#94a3b8" />
              <Text className="text-[13px] text-slate-400">{profile.purok}</Text>
            </View>
          ) : null}
          {syncTimestampQuery.data ? (
            <View className="mt-2">
              <LastSyncedBadge lastSyncedAt={syncTimestampQuery.data} freshnessThresholdMinutes={15} staleTresholdMinutes={30} />
            </View>
          ) : null}
        </View>

        {!isOnline ? (
          <View className="mx-5 mb-4 flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Ionicons name="cloud-offline-outline" size={16} color="#d97706" />
            <Text className="flex-1 text-[13px] font-medium text-amber-700">
              {t("common.offline")}
              {queuedCount > 0 ? ` · ${queuedCount} ping${queuedCount > 1 ? "s" : ""} queued` : ""}
            </Text>
          </View>
        ) : null}

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
                  {formatRelativeTime(latestPing.pinged_at)} · {latestPingIsQueued ? "queued" : "synced"}
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

        {!residentPingEnabled ? (
          <View className="mx-5 mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5">
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5 h-11 w-11 items-center justify-center rounded-full bg-amber-200">
                <Ionicons name="warning-outline" size={22} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-[18px] font-bold text-slate-900">Normal reporting is paused</Text>
                <Text className="mt-1 text-[13px] leading-5 text-amber-800">
                  Your barangay has turned off routine status ping and evacuation check-in for now. If something urgent happens, you can still send an emergency help request below.
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View className="px-5 gap-3">
          {residentPingEnabled ? (
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
                  <Text className="text-[22px] font-black tracking-tight text-white">
                    {t("status.iAmSafe")}
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-emerald-100">
                    {t("status.safeDescription")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#a7f3d0" />
              </View>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => void handleSubmit("need_help")}
            disabled={emergencyActionDisabled}
            className={`overflow-hidden rounded-3xl shadow-sm active:opacity-80 ${
              residentPingEnabled ? "bg-rose-500" : "bg-slate-950"
            }`}
            style={{ minHeight: 96 }}
          >
            <View className="flex-row items-center gap-4 px-6 py-5">
              <View
                className={`h-14 w-14 items-center justify-center rounded-full ${
                  residentPingEnabled ? "bg-rose-400" : "bg-rose-500"
                }`}
              >
                <Ionicons name="alert-circle" size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-black tracking-tight text-white">
                  {residentPingEnabled ? t("status.iNeedHelp") : "Emergency Help"}
                </Text>
                <Text className={`mt-0.5 text-[13px] ${residentPingEnabled ? "text-rose-100" : "text-slate-300"}`}>
                  {residentPingEnabled
                    ? t("status.needHelpDescription")
                    : "Use this if you need immediate assistance during a sudden emergency."}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={residentPingEnabled ? "#fecdd3" : "#ffffff"}
              />
            </View>
          </Pressable>
        </View>

        {feedback ? (
          <View className="mx-5 mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text className="text-[13px] font-medium text-slate-700">{feedback}</Text>
          </View>
        ) : null}

        {residentPingEnabled ? (
          <>
            <View className="mx-5 mt-8 border-t border-slate-200" />
            <ProxyPingSection />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
