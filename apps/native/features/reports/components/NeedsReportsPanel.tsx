import { View } from "react-native";

import { ScreenHeader } from "@/shared/components/ui";

import { NeedsReportFormCard } from "./NeedsReportFormCard";
import { RecentNeedsReportsCard } from "./RecentNeedsReportsCard";
import { useNeedsReportsPanel } from "../hooks/useNeedsReportsPanel";

export function NeedsReportsPanel() {
  const { form, centerIdPlaceholder, reports, submitMutation, handleSubmit } = useNeedsReportsPanel();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.4 Needs reports"
        title="Submit shelter needs"
        description="Capture evacuee counts and urgent supply needs from the field so the barangay can escalate quickly."
      />
      <NeedsReportFormCard
        form={form}
        centerIdPlaceholder={centerIdPlaceholder}
        isSubmitting={submitMutation.isPending}
        onSubmit={handleSubmit}
      />
      <RecentNeedsReportsCard reports={reports} />
    </View>
  );
}
