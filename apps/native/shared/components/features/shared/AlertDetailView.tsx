import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { EmptyState, Pill, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { trpc } from "@/services/trpc";
import { formatDateTime } from "@/shared/utils/date";

function getAlertTone(severity: string) {
  switch (severity) {
    case "danger":
      return "danger" as const;
    case "warning":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

export function AlertDetailView() {
  const params = useLocalSearchParams<{ id?: string }>();

  const alertQuery = useQuery(
    trpc.alerts.getById.queryOptions(
      { id: params.id ?? "" },
      {
        enabled: Boolean(params.id),
      },
    ),
  );

  if (!params.id) {
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

  const alert = alertQuery.data;

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="Alert detail"
        title={alert?.title ?? "Loading alert"}
        description={alert?.hazard_type ? `${alert.hazard_type} update` : "Active barangay alert"}
      />

      {alert ? (
        <>
          <SectionCard
            title="Overview"
            subtitle={`Issued ${formatDateTime(alert.issued_at)}`}
            right={<Pill label={alert.severity.toUpperCase()} tone={getAlertTone(alert.severity)} />}
          >
            <Text className="text-sm leading-7 text-slate-700">{alert.body}</Text>
            {alert.body_filipino ? (
              <Text className="mt-4 text-sm leading-7 text-slate-600">{alert.body_filipino}</Text>
            ) : null}
          </SectionCard>

          <SectionCard title="Recommended actions">
            <Text className="text-sm leading-7 text-slate-700">
              {alert.recommended_actions || "No specific recommended actions were attached to this alert."}
            </Text>
            {alert.recommended_actions_filipino ? (
              <Text className="mt-4 text-sm leading-7 text-slate-600">
                {alert.recommended_actions_filipino}
              </Text>
            ) : null}
          </SectionCard>
        </>
      ) : (
        <SectionCard>
          <EmptyState
            title="Loading alert"
            description="Agap is fetching the full advisory details for this notification."
          />
        </SectionCard>
      )}
    </View>
  );
}
