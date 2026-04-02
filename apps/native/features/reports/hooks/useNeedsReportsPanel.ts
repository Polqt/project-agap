import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";
import { getErrorMessage } from "@/shared/utils/errors";
import { needsReportSchema, type NeedsReportFormValues } from "@/types/forms";

export function useNeedsReportsPanel() {
  const { profile } = useAuth();
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
    trpc.needsReports.list.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
      },
    ),
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
    try {
      await submitMutation.mutateAsync({
        centerId: values.centerId || undefined,
        totalEvacuees: Number(values.totalEvacuees),
        needsFoodPacks: Number(values.needsFoodPacks),
        needsWaterLiters: Number(values.needsWaterLiters),
        needsBlankets: Number(values.needsBlankets),
        needsMedicine: values.needsMedicine,
        medicalCases: values.medicalCases || undefined,
        notes: values.notes || undefined,
      });
    } catch (error) {
      form.setError("root", {
        message: getErrorMessage(error, "Unable to submit the needs report."),
      });
    }
  });

  return {
    form,
    feedback,
    centers: centersQuery.data ?? [],
    reports: reportsQuery.data ?? [],
    submitMutation,
    handleSubmit,
  };
}
