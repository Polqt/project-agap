import { Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";
import { SectionCard } from "@/shared/components/ui";

import { IncidentReportCard } from "./IncidentReportCard";
import { LguExportCard } from "./LguExportCard";
import { NeedsReportFormCard } from "./NeedsReportFormCard";
import { RecentNeedsReportsCard } from "./RecentNeedsReportsCard";
import { useIncidentReportsPanel } from "../hooks/useIncidentReportsPanel";
import { useNeedsReportsPanel } from "../hooks/useNeedsReportsPanel";

export function NeedsReportsPanel() {
  const {
    form,
    feedback,
    centers,
    reports,
    needsSummary,
    isLoadingSummary,
    exportLanguage,
    setExportLanguage,
    isOnline,
    submitMutation,
    handleSubmit,
    copyNeedsSummary,
  } = useNeedsReportsPanel();
  const {
    feedback: incidentFeedback,
    language,
    setLanguage,
    latestReport,
    isGenerating,
    generateReport,
    copyReport,
  } = useIncidentReportsPanel();

  return (
    <ScreenShell
      title="Reports"
      description="Shelter needs and latest submissions."
      feedback={feedback ?? incidentFeedback}
    >
      <SectionCard>
        <Text className="text-xs uppercase tracking-[1px] text-slate-500">
          Workflow: generate AI summary, submit needs report, then review latest submissions.
        </Text>
        {!isOnline ? (
          <Text className="mt-2 text-sm text-amber-700">
            Offline mode: submitted reports are queued on this device and auto-sync later.
          </Text>
        ) : null}
      </SectionCard>
      <IncidentReportCard
        report={latestReport}
        language={language}
        onLanguageChange={setLanguage}
        onGenerate={(forceRefresh) => {
          void generateReport(forceRefresh);
        }}
        onCopy={(reportLanguage) => {
          void copyReport(reportLanguage);
        }}
        isGenerating={isGenerating}
      />
      <NeedsReportFormCard
        form={form}
        centers={centers}
        isSubmitting={submitMutation.isPending}
        onSubmit={handleSubmit}
      />
      <LguExportCard
        summary={needsSummary}
        language={exportLanguage}
        onLanguageChange={setExportLanguage}
        onCopy={(lang) => {
          void copyNeedsSummary(lang);
        }}
        isLoading={isLoadingSummary}
      />
      <RecentNeedsReportsCard reports={reports} />
    </ScreenShell>
  );
}
