import { Text, View } from "react-native";

import { ScreenHeader, SectionCard } from "@/shared/components/ui";

import { NeedsReportFormCard } from "./NeedsReportFormCard";
import { RecentNeedsReportsCard } from "./RecentNeedsReportsCard";
import { useNeedsReportsPanel } from "../hooks/useNeedsReportsPanel";

export function NeedsReportsPanel() {
  const { form, feedback, centers, reports, submitMutation, handleSubmit } = useNeedsReportsPanel();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.4 Needs reports"
        title="Submit shelter needs"
        description="Capture evacuee counts and urgent supply needs from the field so the barangay can escalate quickly."
      />
      {feedback ? (
        <SectionCard>
          <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
        </SectionCard>
      ) : null}
      <NeedsReportFormCard
        form={form}
        centers={centers}
        isSubmitting={submitMutation.isPending}
        onSubmit={handleSubmit}
      />
      <RecentNeedsReportsCard reports={reports} />
    </View>
  );
}
