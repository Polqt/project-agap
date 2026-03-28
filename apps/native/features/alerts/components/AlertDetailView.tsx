import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { formatDateTime } from "@/shared/utils/date";

import { AlertLanguageToggle } from "./AlertLanguageToggle";
import { useAlertDetail } from "../hooks/useAlertDetail";
import { getAlertSignalLabel, getAlertSourceLabel, getAlertTone, isAlertStale } from "../utils";

export function AlertDetailView() {
  const { alertId, alert, alertCopy, isLoading, language, setLanguage, shareAlert } = useAlertDetail();

  if (!alertId) {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader eyebrow="Alert detail" title="No alert selected" />
        <SectionCard>
          <EmptyState
            title="Missing alert id"
            description="Open this screen from the alerts feed so Agap knows which alert to load."
          />
        </SectionCard>
      </View>
    );
  }

  const signalLabel = getAlertSignalLabel(alert?.signal_level);
  const isStale = isAlertStale(alert?.issued_at);

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="Alert detail"
        title={alertCopy?.title ?? "Loading alert"}
        description={alert?.hazard_type ? `${alert.hazard_type} update` : "Active barangay alert"}
        action={alert ? <AppButton label="Share" onPress={() => void shareAlert()} variant="ghost" /> : undefined}
      />

      {alert && alertCopy ? (
        <>
          <SectionCard
            title="Overview"
            subtitle={`Issued ${formatDateTime(alert.issued_at)}`}
            right={<AlertLanguageToggle value={language} onChange={setLanguage} />}
          >
            <View className="mb-4 flex-row flex-wrap gap-2">
              <Pill label={alert.severity.toUpperCase()} tone={getAlertTone(alert.severity)} />
              <Pill label={getAlertSourceLabel(alert.source)} tone="neutral" />
              {signalLabel ? <Pill label={signalLabel} tone="warning" /> : null}
              {isStale ? <Pill label="Older than 72h" tone="neutral" /> : null}
            </View>

            <Text className="text-sm leading-7 text-slate-700">{alertCopy.body}</Text>
          </SectionCard>

          <SectionCard title="Recommended actions">
            <Text className="text-sm leading-7 text-slate-700">
              {alertCopy.recommendedActions || "No specific recommended actions were attached to this alert."}
            </Text>
          </SectionCard>

          {alert.source_url ? (
            <SectionCard title="Source link">
              <Text className="text-sm leading-7 text-blue-700">{alert.source_url}</Text>
            </SectionCard>
          ) : null}
        </>
      ) : (
        <SectionCard>
          <EmptyState
            title={isLoading ? "Loading alert" : "Alert unavailable"}
            description={
              isLoading
                ? "Agap is fetching the full advisory details for this notification."
                : "The requested alert could not be loaded."
            }
          />
        </SectionCard>
      )}
    </View>
  );
}
