import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import * as Clipboard from "expo-clipboard";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import {
  getOfflineNeedsSummary,
  getOfflineScope,
  listOfflineEvacuationCenters,
  listOfflineNeedsReports,
  rebuildOfflineNeedsSummary,
  syncOfflineDatasets,
  upsertOfflineNeedsReport,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import {
  getErrorMessage,
  getServerConnectionErrorMessage,
  isOfflineLikeError,
} from "@/shared/utils/errors";
import { needsReportSchema, type NeedsReportFormValues } from "@/types/forms";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

import { getNeedsSummaryText } from "../services/needsReportExport";
import type { IncidentReportLanguage } from "../types";

export function useNeedsReportsPanel() {
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, queueAction } = useOfflineQueue();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exportLanguage, setExportLanguage] = useState<IncidentReportLanguage>("english");
  const offlineScope = getOfflineScope(profile);

  const form = useForm<NeedsReportFormValues>({
    resolver: zodResolver(needsReportSchema),
    defaultValues: {
      centerId: "",
      totalEvacuees: "0",
      needsFoodPacks: "0",
      needsWaterLiters: "0",
      needsBlankets: "0",
      needsMedicine: false,
      medicalCases: "",
      notes: "",
    },
  });

  const centersQuery = useQuery({
    queryKey: ["offline", "needs-centers", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineEvacuationCenters(offlineScope!.scopeId),
  });

  const reportsQuery = useQuery({
    queryKey: ["offline", "needs-reports", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineNeedsReports(offlineScope!.scopeId),
  });

  const summaryQuery = useQuery({
    queryKey: ["offline", "needs-summary", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineNeedsSummary(offlineScope!.scopeId),
  });

  async function syncDatasets(
    datasets: Parameters<typeof syncOfflineDatasets>[1],
  ) {
    if (!offlineScope) {
      return;
    }

    await syncOfflineDatasets(offlineScope, datasets);
    bumpOfflineDataGeneration();
  }

  const submitMutation = useMutation(
    trpc.needsReports.submit.mutationOptions({
      onMutate: async (payload) => {
        if (!offlineScope) {
          return;
        }

        const optimisticReport = {
          id: `offline-needs-${Date.now()}`,
          barangay_id: offlineScope.barangayId,
          center_id: payload.centerId ?? null,
          submitted_by: offlineScope.profileId,
          total_evacuees: payload.totalEvacuees,
          needs_food_packs: payload.needsFoodPacks,
          needs_water_liters: payload.needsWaterLiters,
          needs_medicine: payload.needsMedicine,
          needs_blankets: payload.needsBlankets,
          medical_cases: payload.medicalCases ?? null,
          notes: payload.notes ?? null,
          status: "pending",
          acknowledged_by: null,
          acknowledged_at: null,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as const;

        await upsertOfflineNeedsReport(offlineScope.scopeId, optimisticReport);
        await rebuildOfflineNeedsSummary(offlineScope.scopeId);
        bumpOfflineDataGeneration();
      },
      onSuccess: async (report) => {
        if (offlineScope) {
          await upsertOfflineNeedsReport(offlineScope.scopeId, report);
          await rebuildOfflineNeedsSummary(offlineScope.scopeId);
        }
        await syncDatasets(["needsReports", "needsSummary"]);
        form.reset({
          centerId: "",
          totalEvacuees: "0",
          needsFoodPacks: "0",
          needsWaterLiters: "0",
          needsBlankets: "0",
          needsMedicine: false,
          medicalCases: "",
          notes: "",
        });
        setFeedback("Needs report submitted.");
      },
      onError: () => {
        void syncDatasets(["needsReports", "needsSummary"]);
      },
    }),
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      centerId: values.centerId || undefined,
      totalEvacuees: Number(values.totalEvacuees),
      needsFoodPacks: Number(values.needsFoodPacks),
      needsWaterLiters: Number(values.needsWaterLiters),
      needsBlankets: Number(values.needsBlankets),
      needsMedicine: values.needsMedicine,
      medicalCases: values.medicalCases || undefined,
      notes: values.notes || undefined,
    };

    if (!isOnline) {
      await queueAction(createQueuedAction("needs-report.submit", payload, offlineScope));
      form.reset({
        centerId: "",
        totalEvacuees: "0",
        needsFoodPacks: "0",
        needsWaterLiters: "0",
        needsBlankets: "0",
        needsMedicine: false,
        medicalCases: "",
        notes: "",
      });
      setFeedback("No connection. Needs report queued and will sync when online.");
      return;
    }

    try {
      await submitMutation.mutateAsync(payload);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("needs-report.submit", payload, offlineScope));
        form.reset({
          centerId: "",
          totalEvacuees: "0",
          needsFoodPacks: "0",
          needsWaterLiters: "0",
          needsBlankets: "0",
          needsMedicine: false,
          medicalCases: "",
          notes: "",
        });
        setFeedback("Connection dropped. Needs report queued for auto-sync.");
        return;
      }

      form.setError("root", {
        message:
          getErrorMessage(error, "") === "Network request failed"
            ? getServerConnectionErrorMessage("Unable to submit the needs report.")
            : getErrorMessage(error, "Unable to submit the needs report."),
      });
    }
  });

  async function copyNeedsSummary(language: IncidentReportLanguage) {
    const summary = summaryQuery.data;
    if (!summary) {
      setFeedback("No pending needs reports to export.");
      return;
    }

    await Clipboard.setStringAsync(getNeedsSummaryText(summary, language));
    setFeedback(language === "filipino" ? "Filipino report copied for LGU." : "English report copied for LGU.");
  }

  return {
    form,
    feedback,
    centers: centersQuery.data ?? [],
    reports: reportsQuery.data ?? [],
    needsSummary: summaryQuery.data ?? null,
    isLoadingSummary: summaryQuery.isLoading,
    exportLanguage,
    setExportLanguage,
    isOnline,
    submitMutation,
    handleSubmit,
    copyNeedsSummary,
  };
}
