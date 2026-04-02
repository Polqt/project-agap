import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import {
  getErrorMessage,
  getServerConnectionErrorMessage,
  isOfflineLikeError,
} from "@/shared/utils/errors";
import { needsReportSchema, type NeedsReportFormValues } from "@/types/forms";

export function useNeedsReportsPanel() {
  const { profile } = useAuth();
  const { isOnline, queueAction } = useOfflineQueue();
  const [feedback, setFeedback] = useState<string | null>(null);

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

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  const reportsQuery = useQuery(
    trpc.needsReports.list.queryOptions({ barangayId: profile?.barangay_id ?? undefined }, {
      enabled: Boolean(profile?.barangay_id),
    }),
  );

  const submitMutation = useMutation(
    trpc.needsReports.submit.mutationOptions({
      onSuccess: () => {
        void reportsQuery.refetch();
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
      await queueAction(createQueuedAction("needs-report.submit", payload));
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
        await queueAction(createQueuedAction("needs-report.submit", payload));
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

  return {
    form,
    feedback,
    centers: centersQuery.data ?? [],
    reports: reportsQuery.data ?? [],
    isOnline,
    submitMutation,
    handleSubmit,
  };
}
