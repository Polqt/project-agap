import { Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";
import { SectionCard } from "@/shared/components/ui";

import { IncidentReportCard } from "./IncidentReportCard";
import { NeedsReportFormCard } from "./NeedsReportFormCard";
import { RecentNeedsReportsCard } from "./RecentNeedsReportsCard";
import { useIncidentReportsPanel } from "../hooks/useIncidentReportsPanel";
import { useNeedsReportsPanel } from "../hooks/useNeedsReportsPanel";

export function NeedsReportsPanel() {
  const { form, feedback, centers, reports, submitMutation, handleSubmit } = useNeedsReportsPanel();
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
      eyebrow="5.3.4 Needs reports"
      title="Submit shelter needs"
      description="Capture evacuee counts and urgent supply needs from the field so the barangay can escalate quickly."
      feedback={feedback ?? incidentFeedback}
    >
      <SectionCard>
        <Text className="text-xs uppercase tracking-[1px] text-slate-500">
          Workflow: generate AI summary, submit needs report, then review latest submissions.
        </Text>
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
      <RecentNeedsReportsCard reports={reports} />
    </ScreenShell>
  );
}
