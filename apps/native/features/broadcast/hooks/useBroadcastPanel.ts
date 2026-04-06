import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { broadcastTemplates } from "@/features/broadcast/constants";
import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import {
  getOfflineScope,
  listOfflineAlerts,
  listOfflineBroadcasts,
  listOfflineMissingPersons,
  listOfflineRegistryHouseholds,
  listOfflineSmsLogs,
  syncOfflineDatasets,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { runWithNetworkResilience } from "@/services/networkResilience";
import { trpcClient } from "@/services/trpc";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";
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

const EMPTY_AUDIENCE = {
  householdCount: 0,
  smsReachableCount: 0,
  appReachableCount: 0,
  puroks: [],
};

export function useBroadcastPanel() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, isWeakConnection, pendingActions, queueAction } = useOfflineQueue();
  const offlineScope = getOfflineScope(profile);
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
    queryKey: ["offline", "broadcasts-panel-history", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineBroadcasts(offlineScope!.scopeId),
  });

  const alertsQuery = useQuery({
    queryKey: ["offline", "broadcasts-panel-alerts", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineAlerts(offlineScope!.scopeId),
  });

  const smsLogsQuery = useQuery({
    queryKey: ["offline", "broadcasts-panel-sms", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineSmsLogs(offlineScope!.scopeId),
  });

  const missingPersonsQuery = useQuery({
    queryKey: ["offline", "broadcasts-panel-missing-persons", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineMissingPersons(offlineScope!.scopeId),
  });

  const audienceQuery = useQuery({
    queryKey: ["offline", "broadcasts-panel-audience", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => {
      const households = await listOfflineRegistryHouseholds(offlineScope!.scopeId);
      const purokMap = new Map<
        string,
        {
          purok: string;
          householdCount: number;
          smsReachableCount: number;
          appReachableCount: number;
        }
      >();

      for (const household of households) {
        const current = purokMap.get(household.purok) ?? {
          purok: household.purok,
          householdCount: 0,
          smsReachableCount: 0,
          appReachableCount: 0,
        };

        current.householdCount += 1;
        if (household.phone_number) {
          current.smsReachableCount += 1;
        }
        if (!household.is_sms_only) {
          current.appReachableCount += 1;
        }

        purokMap.set(household.purok, current);
      }

      const puroks = Array.from(purokMap.values()).sort((left, right) =>
        left.purok.localeCompare(right.purok, "en", { sensitivity: "base" }),
      );

      return {
        householdCount: households.length,
        smsReachableCount: households.filter((household) => household.phone_number).length,
        appReachableCount: households.filter((household) => !household.is_sms_only).length,
        puroks,
      };
    },
  });

  useEffect(() => {
    if (!offlineScope || !isOnline) {
      return;
    }

    void refreshOfflineBroadcastDatasets(["registryHouseholds", "broadcasts", "alerts", "smsLogs", "missingPersons"]).catch(
      (error) => {
        console.error("[Broadcast] Failed to refresh datasets:", error);
      },
    );
  // Run whenever the scope becomes available or we come back online
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineScope?.scopeId, isOnline]);

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
    if (!offlineScope) {
      return {
        label: "Loading profile...",
        householdCount: 0,
        smsReachableCount: 0,
        appReachableCount: 0,
      };
    }

    if (!audienceQuery.data) {
      return {
        label: audienceQuery.isLoading ? "Loading audience..." : "No cached audience yet",
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
  }, [audienceQuery.data, audienceQuery.isLoading, offlineScope, purokOptions, selectedPurok, targetMode]);

  const queuedBroadcastCount = pendingActions.filter((action) => action.type === "broadcast.create").length;

  async function refreshOfflineBroadcastDatasets(
    datasets: Parameters<typeof syncOfflineDatasets>[1] = ["broadcasts", "alerts", "smsLogs", "registryHouseholds"],
  ) {
    if (!offlineScope) {
      return;
    }

    await syncOfflineDatasets(offlineScope, datasets);
    bumpOfflineDataGeneration();
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
    await queueAction(createQueuedAction("broadcast.create", payload, offlineScope));
    form.reset(defaultValues);
    setTargetMode("all");
    setFeedback(message);
    bumpOfflineDataGeneration();
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    if (!offlineScope?.barangayId) {
      form.setError("root", {
        message: "Your official profile is still loading. Wait a moment and try again.",
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
    const queuedAction = createQueuedAction("broadcast.create", payload, offlineScope);
    const livePayload = queuedAction.payload;

    setIsSubmitting(true);

    try {
      let wasPublished = false;

      if (isOnline) {
        try {
          await runWithNetworkResilience(
            "Broadcast publish",
            () =>
              publishBroadcastRecord(prepareBroadcastPayload(livePayload), {
                id: offlineScope.profileId,
                barangay_id: offlineScope.barangayId,
              }),
            { isWeakConnection },
          );
          await runWithNetworkResilience(
            "Broadcast delivery finalize",
            () => trpcClient.broadcasts.create.mutate(livePayload),
            { isWeakConnection },
          );
          wasPublished = true;
          form.reset(defaultValues);
          setTargetMode("all");
          setFeedback(
            isWeakConnection
              ? "Broadcast sent over a weak connection."
              : "Broadcast sent.",
          );
          await refreshOfflineBroadcastDatasets(["broadcasts", "smsLogs", "alerts"]);
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
        await queueAction(queuedAction);
        form.reset(defaultValues);
        setTargetMode("all");
        setFeedback(
          isOnline
            ? "Weak signal prevented live delivery, so the broadcast was staged for automatic retry."
            : "No connection. Broadcast queued locally and will publish once online.",
        );
        return;
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
    isLoadingMissingPersons: missingPersonsQuery.isLoading,
    isLoadingSmsStats: smsLogsQuery.isLoading,
    isOnline,
    isRefreshing:
      alertsQuery.isFetching ||
      audienceQuery.isFetching ||
      broadcastsQuery.isFetching ||
      missingPersonsQuery.isFetching ||
      smsLogsQuery.isFetching,
    isSubmitting,
    missingPersons: missingPersonsQuery.data ?? [],
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
    refresh: refreshOfflineBroadcastDatasets,
  };
}
