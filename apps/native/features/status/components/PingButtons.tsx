import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { haptics } from "@/services/haptics";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { queryClient, trpc } from "@/services/trpc";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/date";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { appShellStore, setLastStatusPing } from "@/stores/app-shell-store";

import { ProxyPingCard } from "./ProxyPingCard";

function triggerHaptic(effect: () => Promise<unknown>) {
  void effect().catch(() => {
    // Best-effort feedback only.
  });
}

export function PingButtons() {
  const { profile } = useAuth();
  const { isOnline, pendingActions, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const lastPingPreview = useStore(appShellStore, (state) => state.lastStatusPing);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [proxySearch, setProxySearch] = useState("");
  const [selectedProxyHouseholdId, setSelectedProxyHouseholdId] = useState<string | null>(null);
  const [proxyMessage, setProxyMessage] = useState("");
  const [proxyFeedback, setProxyFeedback] = useState<string | null>(null);

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

  const proxySearchQuery = useQuery(
    trpc.households.search.queryOptions(
      {
        barangayId: profile?.barangay_id ?? undefined,
        query: proxySearch,
      },
      {
        enabled: Boolean(profile?.barangay_id && proxySearch.trim().length >= 2),
      },
    ),
  );

  const selectedProxyHouseholdQuery = useQuery(
    trpc.households.getById.queryOptions(
      { id: selectedProxyHouseholdId ?? "" },
      {
        enabled: Boolean(selectedProxyHouseholdId),
      },
    ),
  );

  const submitPingMutation = useMutation(
    trpc.statusPings.submit.mutationOptions({
      onSuccess: (result) => {
        queryClient.setQueryData(latestPingQueryKey, result);
        latestPingQuery.refetch();
        setLastStatusPing({
          status: result.status,
          createdAt: Date.parse(result.pinged_at),
          source: "server",
        });
        setFeedback(`Status sent successfully at ${formatDateTime(result.pinged_at)}.`);
        setMessage("");
      },
    }),
  );

  const submitProxyPingMutation = useMutation(
    trpc.statusPings.submit.mutationOptions({
      onSuccess: (result) => {
        setProxyFeedback(`Proxy status sent successfully at ${formatDateTime(result.pinged_at)}.`);
        setProxyMessage("");
        setProxySearch("");
        setSelectedProxyHouseholdId(null);
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
      triggerHaptic(haptics.error);
    } else {
      triggerHaptic(haptics.light);
    }

    if (!isOnline) {
      await queueAction(createQueuedAction("status-ping.submit", payload));
      setLastStatusPing({
        status,
        createdAt: Date.now(),
        source: "queue",
      });
      setFeedback("No connection right now. Your status was safely queued and will sync on reconnect.");
      setMessage("");
      return;
    }

    try {
      await submitPingMutation.mutateAsync(payload);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("status-ping.submit", payload));
        setLastStatusPing({
          status,
          createdAt: Date.now(),
          source: "queue",
        });
        setFeedback("Connection dropped while sending. We queued your ping locally.");
        setMessage("");
        return;
      }

      setFeedback(getErrorMessage(error, "Unable to submit your status."));
    }
  }

  async function handleProxySubmit(status: "safe" | "need_help") {
    if (!selectedProxyHouseholdId) {
      setProxyFeedback("Choose a household first before sending a proxy status.");
      return;
    }

    const payload = {
      householdId: selectedProxyHouseholdId,
      status,
      message: proxyMessage.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setProxyFeedback(null);

    if (status === "need_help") {
      triggerHaptic(haptics.error);
    } else {
      triggerHaptic(haptics.light);
    }

    if (!isOnline) {
      await queueAction(createQueuedAction("status-ping.submit", payload));
      setProxyFeedback("No connection right now. The proxy ping was queued and will sync on reconnect.");
      setProxyMessage("");
      setProxySearch("");
      setSelectedProxyHouseholdId(null);
      return;
    }

    try {
      await submitProxyPingMutation.mutateAsync(payload);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("status-ping.submit", payload));
        setProxyFeedback("Connection dropped while sending. We queued the proxy ping locally.");
        setProxyMessage("");
        setProxySearch("");
        setSelectedProxyHouseholdId(null);
        return;
      }

      setProxyFeedback(getErrorMessage(error, "Unable to submit the proxy status."));
    }
  }

  const latestPing = latestPingQuery.data;
  const queuedStatusCount = pendingActions.filter((action) => action.type === "status-ping.submit").length;
  const latestStatusLabel =
    latestPing?.status === "safe"
      ? "Ligtas Ako"
      : latestPing?.status === "need_help"
        ? "Kailangan ng Tulong"
        : null;
  const heroToneClasses =
    latestPing?.status === "need_help"
      ? "border-rose-200 bg-rose-50"
      : "border-emerald-200 bg-emerald-50";
  const heroBadgeTone =
    latestPing?.status === "need_help" ? ("danger" as const) : ("success" as const);

  return (
    <View className="flex-1 bg-[#f4f7fb] pb-10">
      <View className="mx-5 mt-5 overflow-hidden rounded-[32px] border border-slate-200 bg-white">
        <View className="bg-slate-950 px-5 pb-8 pt-5">
          <View className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-cyan-400/20" />
          <View className="absolute -left-8 bottom-[-24px] h-32 w-32 rounded-full bg-emerald-300/20" />
          <ScreenHeader
            eyebrow="5.2.1 Safety status ping"
            title="Tell your barangay how you are doing"
            description="Fast status broadcasting with offline support, calmer visual cues, and a clearer proxy flow."
          />
        </View>

        <View className="border-t border-slate-200 bg-white px-5 py-4">
          <View className="flex-row flex-wrap gap-3">
            <View className="min-w-[47%] flex-1 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
                Response mode
              </Text>
              <Text className="mt-3 text-lg font-semibold text-slate-950">One-tap resident ping</Text>
            </View>
            <View className="min-w-[47%] flex-1 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
                Queue status
              </Text>
              <Text className="mt-3 text-lg font-semibold text-slate-950">
                {queuedStatusCount > 0 ? `${queuedStatusCount} waiting` : "Ready to send"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <SectionCard title="Your latest status" subtitle="This is the most recent status the barangay should see from your account.">
        {latestPing ? (
          <View className={`rounded-[28px] border p-4 ${heroToneClasses}`}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
                  Latest broadcast
                </Text>
                <Text className="mt-2 text-2xl font-bold text-slate-950">{latestStatusLabel}</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-600">
                  Sent {formatRelativeTime(latestPing.pinged_at)} on {formatDateTime(latestPing.pinged_at)}
                </Text>
              </View>
              <Pill label="Live" tone={heroBadgeTone} />
            </View>
          </View>
        ) : lastPingPreview ? (
          <View className="rounded-[28px] border border-amber-200 bg-amber-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-amber-700">
                  Pending sync
                </Text>
                <Text className="mt-2 text-2xl font-bold text-slate-950">
                  {lastPingPreview.status === "safe" ? "Queued: Ligtas Ako" : "Queued: Kailangan ng Tulong"}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-600">
                  Last local action {formatRelativeTime(lastPingPreview.createdAt)}. It will sync when the connection returns.
                </Text>
              </View>
              <Pill label="Queued" tone="warning" />
            </View>
          </View>
        ) : (
          <View className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8">
            <Text className="text-lg font-semibold text-slate-950">No status sent yet</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-500">
              Your first safety ping will appear here with a live relative timestamp.
            </Text>
          </View>
        )}

        {queuedStatusCount > 0 ? (
          <View className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3">
            <Text className="text-sm font-medium text-amber-800">
              {queuedStatusCount} ping{queuedStatusCount > 1 ? "s" : ""} waiting to sync.
            </Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Situation note" subtitle="Add extra context for responders before you send a ping.">
        <TextField
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="Example: We are at home and ready to evacuate."
          multiline
        />
        {feedback ? (
          <View className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Broadcast your status" subtitle="Two large actions for fast reporting under pressure.">
        <View className="gap-4">
          <View className="overflow-hidden rounded-[30px] border border-emerald-200 bg-emerald-50 p-4">
            <View className="absolute -right-6 -top-4 h-24 w-24 rounded-full bg-emerald-300/40" />
            <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-emerald-700">
              Safe status
            </Text>
            <Text className="mt-2 text-xl font-bold text-slate-950">Ligtas Ako</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">
              Use this when your household is safe and the barangay can count you as accounted for.
            </Text>
            <View className="mt-4">
              <AppButton label="Send Ligtas Ako" onPress={() => void handleSubmit("safe")} />
            </View>
          </View>

          <View className="overflow-hidden rounded-[30px] border border-rose-200 bg-rose-50 p-4">
            <View className="absolute -right-6 -top-4 h-24 w-24 rounded-full bg-rose-300/35" />
            <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-rose-700">
              Emergency status
            </Text>
            <Text className="mt-2 text-xl font-bold text-slate-950">Kailangan ng Tulong</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">
              Use this when you need urgent help. This action triggers immediate haptic feedback.
            </Text>
            <View className="mt-4">
              <AppButton
                label="Send Help Request"
                onPress={() => void handleSubmit("need_help")}
                variant="danger"
                loading={submitPingMutation.isPending && submitPingMutation.variables?.status === "need_help"}
              />
            </View>
          </View>
        </View>
      </SectionCard>

      <ProxyPingCard
        searchValue={proxySearch}
        onChangeSearch={setProxySearch}
        households={proxySearchQuery.data ?? []}
        selectedHouseholdId={selectedProxyHouseholdId}
        onSelectHousehold={setSelectedProxyHouseholdId}
        selectedHousehold={selectedProxyHouseholdQuery.data ?? null}
        note={proxyMessage}
        onChangeNote={setProxyMessage}
        onSubmitSafe={() => void handleProxySubmit("safe")}
        onSubmitNeedHelp={() => void handleProxySubmit("need_help")}
        isSearching={proxySearchQuery.isFetching}
        isSubmittingSafe={
          submitProxyPingMutation.isPending && submitProxyPingMutation.variables?.status === "safe"
        }
        isSubmittingNeedHelp={
          submitProxyPingMutation.isPending &&
          submitProxyPingMutation.variables?.status === "need_help"
        }
        feedback={proxyFeedback}
      />
    </View>
  );
}
