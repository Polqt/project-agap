import { View } from "react-native";

import { AppButton, EmptyState, ScreenHeader, SectionCard } from "@/shared/components/ui";

import { AlertCard } from "./AlertCard";
import { useAlertsFeed } from "../hooks/useAlertsFeed";

export function AlertsFeed() {
  const { alerts, isLoading, isRefreshing, isError, errorMessage, refresh, openAlertDetail } = useAlertsFeed();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.4 Alert feed"
        title="Current alerts"
        description="View active warnings, advisories, and recommended actions for your barangay."
        action={<AppButton label="Refresh" onPress={() => void refresh()} variant="ghost" loading={isRefreshing} />}
      />

      {isError ? (
        <SectionCard title="Could not refresh alerts" subtitle={errorMessage ?? "Please try again."}>
          <EmptyState
            title="Connection issue"
            description="Agap could not refresh the resident alert feed right now. You can retry without leaving this screen."
          />
        </SectionCard>
      ) : null}

      {alerts.length ? (
        alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onPress={() => openAlertDetail(alert.id)} />
        ))
      ) : (
        <SectionCard>
          <EmptyState
            title={isLoading || isRefreshing ? "Loading alerts" : "No active alerts"}
            description={
              isLoading || isRefreshing
                ? "Agap is checking for the latest warnings and advisories in your barangay."
                : "When PAGASA, PHIVOLCS, or your barangay issues an alert, it will show here."
            }
          />
        </SectionCard>
      )}
    </View>
  );
}
