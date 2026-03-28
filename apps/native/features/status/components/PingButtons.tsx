import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/date";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { appShellStore, setLastStatusPing } from "@/stores/app-shell-store";

export function PingButtons() {
  const { profile } = useAuth();
  const { isOnline, pendingActions, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const lastPingPreview = useStore(appShellStore, (state) => state.lastStatusPing);
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

  const submitPingMutation = useMutation(
    trpc.statusPings.submit.mutationOptions({
      onSuccess: (result) => {
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

  async function handleSubmit(status: "safe" | "need_help") {
    const payload = {
      householdId: householdQuery.data?.id ?? undefined,
      status,
      message: message.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);

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

  const latestPing = latestPingQuery.data;
  const queuedStatusCount = pendingActions.filter((action) => action.type === "status-ping.submit").length;

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.1 Safety status ping"
        title="Tell your barangay how you are doing"
        description="Large one-tap actions for 'Ligtas Ako' and 'Kailangan ng Tulong', with offline queueing when signal drops."
      />

      <SectionCard title="Your latest status" subtitle="This helps you confirm what the barangay sees right now.">
        <View className="gap-3">
          {latestPing ? (
            <>
              <Pill label={latestPing.status === "safe" ? "Ligtas Ako" : "Kailangan ng Tulong"} tone={latestPing.status === "safe" ? "success" : "danger"} />
              <Text className="text-sm leading-6 text-slate-600">
                Sent {formatRelativeTime(latestPing.pinged_at)} on {formatDateTime(latestPing.pinged_at)}
              </Text>
            </>
          ) : lastPingPreview ? (
            <>
              <Pill label={lastPingPreview.status === "safe" ? "Queued: Ligtas Ako" : "Queued: Kailangan ng Tulong"} tone={lastPingPreview.status === "safe" ? "warning" : "danger"} />
              <Text className="text-sm leading-6 text-slate-600">
                Last local action {formatRelativeTime(lastPingPreview.createdAt)}. It will sync when the connection returns.
              </Text>
            </>
          ) : (
            <Text className="text-sm leading-6 text-slate-600">
              You have not sent a status yet in this session.
            </Text>
          )}

          {queuedStatusCount > 0 ? (
            <Text className="text-sm font-medium text-amber-700">
              {queuedStatusCount} ping{queuedStatusCount > 1 ? "s" : ""} waiting to sync.
            </Text>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard title="Optional note" subtitle="Add context for officials if you need help or want to share your situation.">
        <TextField
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="Example: We are at home and ready to evacuate."
          multiline
        />
        {feedback ? <Text className="mt-3 text-sm text-slate-600">{feedback}</Text> : null}
      </SectionCard>

      <SectionCard title="Broadcast your status" subtitle="These actions stay reachable in two taps from app open, as required in the PRD.">
        <View className="gap-3">
          <AppButton label="Ligtas Ako" onPress={() => void handleSubmit("safe")} />
          <AppButton
            label="Kailangan ng Tulong"
            onPress={() => void handleSubmit("need_help")}
            variant="danger"
            loading={submitPingMutation.isPending && submitPingMutation.variables?.status === "need_help"}
          />
        </View>
      </SectionCard>
    </View>
  );
}
