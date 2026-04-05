import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import { formatDateTime } from "@/shared/utils/date";
import type { IncidentReport } from "@project-agap/api/supabase";

import { getIncidentReportText } from "../services/incidentReport";
import type { IncidentReportLanguage } from "../types";

type Props = {
  report: IncidentReport | null;
  language: IncidentReportLanguage;
  onLanguageChange: (language: IncidentReportLanguage) => void;
  onGenerate: (forceRefresh?: boolean) => void;
  onCopy: (language: IncidentReportLanguage) => void;
  isGenerating: boolean;
};

export function IncidentReportCard({
  report,
  language,
  onLanguageChange,
  onGenerate,
  onCopy,
  isGenerating,
}: Props) {
  const title = language === "filipino" ? report?.title_filipino : report?.title_english;
  const body = language === "filipino" ? report?.body_filipino : report?.body_english;
  const nextSteps = language === "filipino" ? report?.next_steps_filipino : report?.next_steps_english;

  return (
    <SectionCard
      title="AI Incident report"
      subtitle="Official-only bilingual summary validated against current dashboard counts."
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
        <View className="flex-row gap-3">
          <View className="flex-1">
            <AppButton
              label={report ? "Regenerate report" : "Generate report"}
              onPress={() => onGenerate(Boolean(report))}
              loading={isGenerating}
            />
          </View>
          <View className="flex-1">
            <AppButton
              label="Copy"
              variant="ghost"
              onPress={() => onCopy(language)}
              disabled={!report}
            />
          </View>
        </View>

        {report ? (
          <View className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Pill label={language === "filipino" ? "Filipino" : "English"} tone="info" />
              <Text className="text-xs uppercase tracking-[1px] text-slate-400">
                {formatDateTime(report.created_at)}
              </Text>
            </View>
            <Text className="text-base font-semibold text-slate-950">{title}</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-700">{body}</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-700">{nextSteps}</Text>
            <Text className="mt-3 text-xs text-slate-500">
              Source: {report.generation_source} | Snapshot:{" "}
              {JSON.stringify(report.dashboard_snapshot)}
            </Text>
          </View>
        ) : (
          <EmptyState
            title="No incident report yet"
            description="Generate a bilingual incident report for municipal LGU escalation."
          />
        )}

        {report ? (
          <View className="rounded-2xl border border-slate-200 bg-white p-3">
            <Text className="text-xs font-medium text-slate-600 mb-2">Quick copy preview:</Text>
            <Text className="text-xs text-slate-500 leading-5">
              {getIncidentReportText(report, language)}
            </Text>
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}
