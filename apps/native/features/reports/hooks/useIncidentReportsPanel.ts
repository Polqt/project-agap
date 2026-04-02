import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";

import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage } from "@/shared/utils/errors";

import { getIncidentReportText } from "../services/incidentReport";
import type { IncidentReportLanguage } from "../types";

export function useIncidentReportsPanel() {
  const { profile } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [language, setLanguage] = useState<IncidentReportLanguage>("english");

  const listQuery = useQuery(
    trpc.incidentReports.list.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  const generateMutation = useMutation(
    trpc.incidentReports.generate.mutationOptions({
      onSuccess: (result) => {
        void listQuery.refetch();
        if (result.cachedMessage) {
          setFeedback(result.cachedMessage);
          return;
        }

        setFeedback("Incident report generated.");
      },
      onError: (error) => {
        setFeedback(getErrorMessage(error, "Unable to generate incident report."));
      },
    }),
  );

  const latestReport = listQuery.data?.[0] ?? null;

  async function generateReport(forceRefresh = false) {
    await generateMutation.mutateAsync({
      barangayId: profile?.barangay_id ?? undefined,
      forceRefresh,
    });
  }

  async function copyReport(languageToCopy: IncidentReportLanguage) {
    if (!latestReport) {
      setFeedback("No incident report available to copy.");
      return;
    }

    await Clipboard.setStringAsync(getIncidentReportText(latestReport, languageToCopy));
    setFeedback(languageToCopy === "filipino" ? "Filipino report copied." : "English report copied.");
  }

  return {
    feedback,
    language,
    setLanguage,
    latestReport,
    reports: listQuery.data ?? [],
    isLoadingReports: listQuery.isLoading,
    isGenerating: generateMutation.isPending,
    generateReport,
    copyReport,
  };
}
