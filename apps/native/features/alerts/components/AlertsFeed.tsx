import { View } from "react-native";

import { EmptyState, ScreenHeader, SectionCard } from "@/shared/components/ui";

import { AlertCard } from "./AlertCard";
import { useAlertsFeed } from "../hooks/useAlertsFeed";

export function AlertsFeed() {
  const { alerts, isLoading, openAlertDetail } = useAlertsFeed();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.4 Alert feed"
        title="Current alerts"
        description="View active warnings, advisories, and recommended actions for your barangay."
      />

      {alerts.length ? (
        alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onPress={() => openAlertDetail(alert.id)} />
        ))
      ) : (
        <SectionCard>
          <EmptyState
            title={isLoading ? "Loading alerts" : "No active alerts"}
            description={
              isLoading
                ? "Agap is checking for the latest warnings and advisories in your barangay."
                : "When PAGASA, PHIVOLCS, or your barangay issues an alert, it will show here."
            }
          />
        </SectionCard>
      )}
    </View>
  );
}
