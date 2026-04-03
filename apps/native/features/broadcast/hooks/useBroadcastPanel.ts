import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { broadcastTemplates } from "@/features/broadcast/constants";
import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpcClient } from "@/services/trpc";
import {
  getErrorMessage,
  getServerConnectionErrorMessage,
  isOfflineLikeError,
} from "@/shared/utils/errors";
import { broadcastSchema, type BroadcastFormValues } from "@/types/forms";
import type { SmsLog } from "@project-agap/api/supabase";

import {
  getBroadcastAudienceOverview,
  listBroadcastsForBarangay,
  listActiveAgencyAlerts,
  listOutboundSmsLogsForBarangay,
  mergeBroadcastHistory,
  prepareBroadcastPayload,
  publishBroadcastRecord,
  type BroadcastTimelineItem,
} from "../services/broadcasts";

const defaultValues: BroadcastFormValues = {
  broadcastType: "stay_alert",
  message: "",
  messageFilipino: "",
  targetPurok: "",
};

type BroadcastTab = "send" | "notifications";
type DeliveryLanguage = "english" | "filipino";
type TargetMode = "all" | "purok";

type DeliveryStats = {
  sent: number;
  delivered: number;
  replied: number;
  failed: number;
  total: number;
};

function shouldQueueFinalize(error: unknown) {
  if (isOfflineLikeError(error)) {
    return true;
  }

  const message = getErrorMessage(error, "").toLowerCase();
  return message.includes("internal server error") || message.includes("timed out");
}

function normalizeDeliveryStats(logs: SmsLog[]) {
  const stats = new Map<string, DeliveryStats>();

  for (const log of logs) {
    if (!log.broadcast_id || log.direction !== "outbound") {
      continue;
    }

    const current = stats.get(log.broadcast_id) ?? {
      sent: 0,
      delivered: 0,
      replied: 0,
      failed: 0,
      total: 0,
    };

    current.total += 1;

    if (log.delivery_status === "failed") {
      current.failed += 1;
    } else {
      current.sent += 1;
    }

    if (log.delivery_status === "delivered" || log.delivery_status === "replied" || Boolean(log.delivered_at)) {
      current.delivered += 1;
    }

    if (log.delivery_status === "replied" || Boolean(log.replied_at)) {
      current.replied += 1;
      if (current.delivered === 0) {
        current.delivered += 1;
      }
    }

    stats.set(log.broadcast_id, current);
  }

  return stats;
}

function getInitialTab(value: string | string[] | undefined): BroadcastTab {
  const resolvedValue = Array.isArray(value) ? value[0] : value;
  return resolvedValue === "notifications" ? "notifications" : "send";
}

function queryStartsWithRoot(queryKey: readonly unknown[], root: string) {
  const first = queryKey[0];

  if (typeof first === "string") {
    return first === root;
  }

  return Array.isArray(first) && first[0] === root;
}

export function useBroadcastPanel() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const { profile } = useAuth();
  const { isOnline, pendingActions, queueAction } = useOfflineQueue();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BroadcastTab>(getInitialTab(params.tab));
  const [deliveryLanguage, setDeliveryLanguage] = useState<DeliveryLanguage>("english");
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues,
  });

  useEffect(() => {
    setActiveTab(getInitialTab(params.tab));
  }, [params.tab]);

  const broadcastsQuery = useQuery({
    queryKey: ["broadcasts", "official", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    queryFn: async () => listBroadcastsForBarangay(profile!.barangay_id!),
  });

  const alertsQuery = useQuery({
    queryKey: ["alerts", "active", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    refetchInterval: 60_000,
    queryFn: async () => listActiveAgencyAlerts(profile!.barangay_id!),
  });

  const smsLogsQuery = useQuery({
    queryKey: ["smsLogs", "outbound", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    refetchInterval: 60_000,
    queryFn: async () => listOutboundSmsLogsForBarangay(profile!.barangay_id!),
  });

  const audienceQuery = useQuery({
    queryKey: ["broadcasts", "audience", profile?.barangay_id],
    enabled: Boolean(profile?.barangay_id),
    refetchInterval: 60_000,
    queryFn: async () => getBroadcastAudienceOverview(profile!.barangay_id!),
  });

  const broadcasts = useMemo(
    () => mergeBroadcastHistory(broadcastsQuery.data ?? [], pendingActions),
    [broadcastsQuery.data, pendingActions],
  );

  const alerts = alertsQuery.data ?? [];

  const deliveryStatsByBroadcastId = useMemo(
    () => normalizeDeliveryStats(smsLogsQuery.data ?? []),
    [smsLogsQuery.data],
  );

  const purokOptions = audienceQuery.data?.puroks ?? [];

  const selectedPurok = form.watch("targetPurok")?.trim() ?? "";

  const recipientPreview = useMemo(() => {
    if (!audienceQuery.data) {
      return {
        label: "Loading audience...",
        householdCount: 0,
        smsReachableCount: 0,
        appReachableCount: 0,
      };
    }

    if (targetMode === "all") {
      return {
        label: "Entire barangay",
        householdCount: audienceQuery.data.householdCount,
        smsReachableCount: audienceQuery.data.smsReachableCount,
        appReachableCount: audienceQuery.data.appReachableCount,
      };
    }

    const purokAudience = purokOptions.find((entry) => entry.purok === selectedPurok);

    if (!purokAudience) {
      return {
        label: "Select a purok",
        householdCount: 0,
        smsReachableCount: 0,
        appReachableCount: 0,
      };
    }

    return {
      label: purokAudience.purok,
      householdCount: purokAudience.householdCount,
      smsReachableCount: purokAudience.smsReachableCount,
      appReachableCount: purokAudience.appReachableCount,
    };
  }, [audienceQuery.data, purokOptions, selectedPurok, targetMode]);

  const queuedBroadcastCount = pendingActions.filter((action) => action.type === "broadcast.create").length;

  function invalidateByRoot(root: string) {
    return queryClient.invalidateQueries({
      predicate: (queryState) => queryStartsWithRoot(queryState.queryKey, root),
    });
  }

  function changeDeliveryLanguage(nextLanguage: DeliveryLanguage) {
    const selectedTemplate = broadcastTemplates.find(
      (entry) => entry.broadcastType === form.getValues("broadcastType"),
    );
    const currentMessage = form.getValues("message").trim();

    if (
      selectedTemplate &&
      (currentMessage === "" ||
        currentMessage === selectedTemplate.message ||
        currentMessage === selectedTemplate.messageFilipino)
    ) {
      form.setValue(
        "message",
        nextLanguage === "filipino" ? selectedTemplate.messageFilipino : selectedTemplate.message,
      );
    }

    setDeliveryLanguage(nextLanguage);
  }

  function applyTemplate(type: BroadcastFormValues["broadcastType"]) {
    const template = broadcastTemplates.find((entry) => entry.broadcastType === type);

    form.setValue("broadcastType", type);

    if (!template) {
      return;
    }

    form.setValue(
      "message",
      deliveryLanguage === "filipino" ? template.messageFilipino : template.message,
    );
    form.setValue("messageFilipino", template.messageFilipino);
  }

  function loadBroadcastIntoComposer(broadcast: BroadcastTimelineItem) {
    form.setValue("broadcastType", broadcast.broadcast_type);
    form.setValue("message", broadcast.message);
    form.setValue("messageFilipino", broadcast.message_filipino ?? "");
    form.setValue("targetPurok", broadcast.target_purok ?? "");
    setTargetMode(broadcast.target_purok ? "purok" : "all");
    setDeliveryLanguage("english");
    setActiveTab("send");
    setFeedback("Previous broadcast loaded into composer.");
  }

  async function queueBroadcast(payload: ReturnType<typeof prepareBroadcastPayload>, message: string) {
    await queueAction(createQueuedAction("broadcast.create", payload));
    form.reset(defaultValues);
    setTargetMode("all");
    setFeedback(message);
    void invalidateByRoot("broadcasts");
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    if (!profile?.barangay_id) {
      form.setError("root", {
        message: "Your official profile is not assigned to a barangay yet.",
      });
      return;
    }

    if (targetMode === "purok" && !selectedPurok) {
      form.setError("root", {
        message: "Pick a purok before sending a scoped broadcast.",
      });
      return;
    }

    const message = values.message.trim();
    const payload = prepareBroadcastPayload({
      broadcastType: values.broadcastType,
      message,
      messageFilipino: values.messageFilipino?.trim() || null,
      targetPurok: targetMode === "purok" ? selectedPurok : null,
    });

    setIsSubmitting(true);

    try {
      let wasPublished = false;

      if (isOnline) {
        try {
          await publishBroadcastRecord(payload, profile);
          wasPublished = true;
          void invalidateByRoot("broadcasts");
        } catch (publishError) {
          if (!isOfflineLikeError(publishError)) {
            form.setError("root", {
              message: getErrorMessage(publishError, "Unable to publish the broadcast."),
            });
            return;
          }
        }
      }

      if (!wasPublished) {
        await queueBroadcast(
          payload,
          isOnline
            ? "Connection dropped before Supabase publish. Broadcast queued locally and will publish once online."
            : "No connection. Broadcast queued locally and will publish once online.",
        );
        return;
      }

      try {
        await trpcClient.broadcasts.create.mutate(payload);
        form.reset(defaultValues);
        setTargetMode("all");
        setFeedback("Broadcast sent.");
        void Promise.all([invalidateByRoot("broadcasts"), invalidateByRoot("smsLogs")]);
      } catch (finalizeError) {
        if (shouldQueueFinalize(finalizeError)) {
          await queueBroadcast(
            payload,
            "Broadcast published to Supabase. SMS fan-out will resume once the web server is reachable.",
          );
          return;
        }

        form.reset(defaultValues);
        setTargetMode("all");
        setFeedback(
          `Broadcast published, but delivery follow-up needs attention. ${getErrorMessage(
            finalizeError,
            getServerConnectionErrorMessage("Unable to confirm delivery."),
          )}`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return {
    form,
    activeTab,
    alerts,
    broadcasts,
    broadcastsError:
      broadcastsQuery.error ? getErrorMessage(broadcastsQuery.error, "Unable to load broadcasts.") : null,
    deliveryLanguage,
    deliveryStatsByBroadcastId,
    feedback,
    isLoadingAlerts: alertsQuery.isLoading,
    isLoadingAudience: audienceQuery.isLoading,
    isLoadingBroadcasts: broadcastsQuery.isLoading,
    isLoadingSmsStats: smsLogsQuery.isLoading,
    isOnline,
    isRefreshing:
      alertsQuery.isFetching ||
      audienceQuery.isFetching ||
      broadcastsQuery.isFetching ||
      smsLogsQuery.isFetching,
    isSubmitting,
    purokOptions,
    queuedBroadcastCount,
    recipientPreview,
    targetMode,
    applyTemplate,
    changeDeliveryLanguage,
    handleSubmit,
    loadBroadcastIntoComposer,
    setActiveTab,
    setTargetMode,
  };
}
