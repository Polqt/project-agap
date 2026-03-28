import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { EmptyState, Pill, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/date";

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

export function AlertsFeed() {
  const router = useRouter();
  const { profile } = useAuth();

  const alertsQuery = useQuery(
    trpc.alerts.listActive.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.4 Alert feed"
        title="Current alerts"
        description="View active warnings, advisories, and recommended actions for your barangay."
      />

      {alertsQuery.data?.length ? (
        alertsQuery.data.map((alert) => (
          <Pressable
            key={alert.id}
            onPress={() => router.push({ pathname: "/alert-detail", params: { id: alert.id } })}
          >
            <SectionCard
              title={alert.title}
              subtitle={`${alert.hazard_type} • ${formatRelativeTime(alert.issued_at)}`}
              right={<Pill label={alert.severity.toUpperCase()} tone={getAlertTone(alert.severity)} />}
            >
              <Text className="text-sm leading-6 text-slate-600">{alert.body}</Text>
              <Text className="mt-3 text-xs uppercase tracking-[1.2px] text-slate-400">
                Issued {formatDateTime(alert.issued_at)}
              </Text>
            </SectionCard>
          </Pressable>
        ))
      ) : (
        <SectionCard>
          <EmptyState
            title="No active alerts"
            description="When PAGASA, PHIVOLCS, or your barangay issues an alert, it will show here."
          />
        </SectionCard>
      )}
    </View>
  );
}
