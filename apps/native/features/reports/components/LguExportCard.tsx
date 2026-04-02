import { Text, View } from "react-native";

import { AppButton, EmptyState, SectionCard } from "@/shared/components/ui";
import type { NeedsSummary } from "@project-agap/api/ai/needsSummaryBuilder";

import { getNeedsSummaryText } from "../services/needsReportExport";
import type { IncidentReportLanguage } from "../types";

type Props = {
  summary: NeedsSummary | null;
  language: IncidentReportLanguage;
  onLanguageChange: (language: IncidentReportLanguage) => void;
  onCopy: (language: IncidentReportLanguage) => void;
  isLoading: boolean;
};

export function LguExportCard({
  summary,
  language,
  onLanguageChange,
  onCopy,
  isLoading,
}: Props) {
  return (
    <SectionCard
      title="LGU Export"
      subtitle="Copy formatted needs report for municipal/city submission."
      right={
        <View className="flex-row gap-2">
          <AppButton
            label="EN"
            variant={language === "english" ? "secondary" : "ghost"}
            onPress={() => onLanguageChange("english")}
          />
          <AppButton
            label="FIL"
            variant={language === "filipino" ? "secondary" : "ghost"}
            onPress={() => onLanguageChange("filipino")}
          />
        </View>
      }
    >
      <View className="gap-4">
        {isLoading ? (
          <Text className="text-sm text-slate-500">Loading summary...</Text>
        ) : summary ? (
          <>
            <View className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <Text className="text-xs uppercase tracking-[1px] text-slate-400 mb-2">
                {language === "filipino" ? "Preview (Filipino)" : "Preview (English)"}
              </Text>
              <Text className="text-sm leading-6 text-slate-700">
                {getNeedsSummaryText(summary, language)}
              </Text>
            </View>
            <AppButton
              label="Copy for LGU"
              onPress={() => onCopy(language)}
            />
          </>
        ) : (
          <EmptyState
            title="No pending reports"
            description="Submit a needs report first to generate an LGU export summary."
          />
        )}
      </View>
    </SectionCard>
  );
}
