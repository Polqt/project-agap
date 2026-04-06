import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { haptics } from "@/services/haptics";
import {
  getOfflineRegistryHousehold,
  getOfflineScope,
  saveOfflineLatestStatusPing,
  searchOfflineRegistryHouseholds,
  syncOfflineDatasets,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { runWithNetworkResilience } from "@/services/networkResilience";
import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { formatDateTime } from "@/shared/utils/date";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

import type { Household } from "@project-agap/api/supabase";

export function ProxyPingSection() {
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, isWeakConnection, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const offlineScope = getOfflineScope(profile);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: ["offline", "proxy-status-search", offlineScope?.scopeId, search, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId && search.trim().length >= 2),
    queryFn: async () => searchOfflineRegistryHouseholds(offlineScope!.scopeId, search),
  });

  const selectedQuery = useQuery({
    queryKey: ["offline", "proxy-status-household", offlineScope?.scopeId, selectedId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId && selectedId),
    queryFn: async () => getOfflineRegistryHousehold(offlineScope!.scopeId, selectedId!),
  });

  const mutation = useMutation(
    trpc.statusPings.submit.mutationOptions({
      onSuccess: async (result) => {
        if (offlineScope) {
          await saveOfflineLatestStatusPing(offlineScope.scopeId, result);
          await syncOfflineDatasets(offlineScope, ["latestStatusPing"]);
          bumpOfflineDataGeneration();
        }
        setFeedback(`Proxy sent at ${formatDateTime(result.pinged_at)}.`);
        setNote("");
        setSearch("");
        setSelectedId(null);
      },
    }),
  );

  async function handleProxy(status: "safe" | "need_help") {
    if (!selectedId) {
      setFeedback("Select a household first.");
      return;
    }

    const payload = {
      householdId: selectedId,
      status,
      message: note.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };
    const queuedAction = createQueuedAction("status-ping.submit", payload, offlineScope);
    const livePayload = queuedAction.payload;

    setFeedback(null);
    void (status === "need_help" ? haptics.heavy() : haptics.light()).catch(() => {});

    if (!isOnline) {
      await queueAction(queuedAction);
      if (offlineScope) {
        await saveOfflineLatestStatusPing(offlineScope.scopeId, {
          id: livePayload.clientMutationId ?? `offline-proxy-status-${Date.now()}`,
          barangay_id: offlineScope.barangayId,
          resident_id: offlineScope.profileId,
          household_id: selectedId,
          status,
          channel: "app",
          latitude: livePayload.latitude ?? null,
          longitude: livePayload.longitude ?? null,
          message: livePayload.message ?? null,
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
          pinged_at: new Date().toISOString(),
        });
        bumpOfflineDataGeneration();
      }
      setFeedback("Queued offline.");
      setNote("");
      setSearch("");
      setSelectedId(null);
      return;
    }

    try {
      await runWithNetworkResilience(
        "Proxy status ping",
        () => mutation.mutateAsync(livePayload),
        { isWeakConnection },
      );
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(queuedAction);
        if (offlineScope) {
          await saveOfflineLatestStatusPing(offlineScope.scopeId, {
            id: livePayload.clientMutationId ?? `offline-proxy-status-${Date.now()}`,
            barangay_id: offlineScope.barangayId,
            resident_id: offlineScope.profileId,
            household_id: selectedId,
            status,
            channel: "app",
            latitude: livePayload.latitude ?? null,
            longitude: livePayload.longitude ?? null,
            message: livePayload.message ?? null,
            is_resolved: false,
            resolved_by: null,
            resolved_at: null,
            pinged_at: new Date().toISOString(),
          });
          bumpOfflineDataGeneration();
        }
        setFeedback(
          isWeakConnection
            ? "Weak signal prevented live delivery, so the proxy ping was staged for retry."
            : "Connection dropped. Queued locally.",
        );
        setNote("");
        setSearch("");
        setSelectedId(null);
        return;
      }
      setFeedback(getErrorMessage(error, "Unable to send proxy status."));
    }
  }

  const households: Household[] = searchQuery.data ?? [];
  const selected = selectedQuery.data ?? null;
  const hasSearch = search.trim().length >= 2;

  return (
    <View className="px-5 pt-4">
      <Text className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">
        Ping for another household
      </Text>

      {/* Search */}
      <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setSelectedId(null);
          }}
          placeholder="Household head, purok..."
          className="flex-1 py-2.5 text-[14px] text-slate-900"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Results */}
      {hasSearch && !searchQuery.isFetching && !households.length ? (
        <Text className="mt-3 text-[13px] text-slate-400">No households found.</Text>
      ) : null}

      {households.map((h) => {
        const active = selectedId === h.id;
        return (
          <Pressable
            key={h.id}
            onPress={() => setSelectedId(h.id)}
            className={`mt-2 flex-row items-center justify-between rounded-xl border px-3.5 py-3 ${
              active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-slate-900">{h.household_head}</Text>
              <Text className="text-[12px] text-slate-500">
                {h.purok} \u00b7 {h.total_members} member{h.total_members > 1 ? "s" : ""}
              </Text>
            </View>
            {active ? <Ionicons name="checkmark-circle" size={18} color="#2563eb" /> : null}
          </Pressable>
        );
      })}

      {/* Selected household actions */}
      {selected ? (
        <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
          <Text className="text-[13px] font-medium text-slate-600">
            Reporting for <Text className="font-semibold text-slate-900">{selected.household_head}</Text>
          </Text>

          {/* Inline two-button row */}
          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => void handleProxy("safe")}
              disabled={mutation.isPending}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 py-3 active:opacity-80"
            >
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text className="text-[13px] font-semibold text-emerald-700">Ligtas</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleProxy("need_help")}
              disabled={mutation.isPending}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-rose-100 px-3 py-3 active:opacity-80"
            >
              <Ionicons name="alert-circle" size={16} color="#e11d48" />
              <Text className="text-[13px] font-semibold text-rose-700">Tulong</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Feedback */}
      {feedback ? (
        <View className="mt-2 rounded-xl bg-slate-100 px-3.5 py-2.5">
          <Text className="text-[12px] text-slate-600">{feedback}</Text>
        </View>
      ) : null}
    </View>
  );
}
