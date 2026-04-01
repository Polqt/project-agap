import { Text, View } from "react-native";

import { AppButton, ScreenHeader, SectionCard } from "@/shared/components/ui";

import { CenterQrCard } from "./CenterQrCard";
import { CenterStatusCard } from "./CenterStatusCard";
import { DashboardSummaryCards } from "./DashboardSummaryCards";
import { PriorityQueueCard } from "./PriorityQueueCard";
import { UnaccountedHouseholdsCard } from "./UnaccountedHouseholdsCard";
import { useOfficialDashboard } from "../hooks/useOfficialDashboard";

export function OfficialDashboard() {
  const {
    signOut,
    feedback,
    summary,
    unresolvedPings,
    centers,
    unaccountedHouseholds,
    resolveMutation,
    toggleCenterMutation,
    rotateQrMutation,
    copyCenterToken,
    shareCenterToken,
  } = useOfficialDashboard();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.1 Live dashboard"
        title="Barangay command view"
        description="Track safe, need-help, checked-in, and unaccounted households from one screen."
        action={<AppButton label="Sign out" onPress={() => void signOut()} variant="ghost" />}
      />
      {feedback ? (
        <SectionCard>
          <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
        </SectionCard>
      ) : null}
      <DashboardSummaryCards summary={summary} />
      <PriorityQueueCard
        unresolvedPings={unresolvedPings}
        isResolving={resolveMutation.isPending}
        resolvingPingId={resolveMutation.variables?.pingId}
        onResolve={(pingId) => {
          void resolveMutation.mutateAsync({ pingId });
        }}
      />
      <UnaccountedHouseholdsCard households={unaccountedHouseholds} />
      <CenterStatusCard
        centers={centers}
        isUpdating={toggleCenterMutation.isPending}
        updatingCenterId={toggleCenterMutation.variables?.centerId}
        onToggle={(centerId, isOpen) => {
          void toggleCenterMutation.mutateAsync({ centerId, isOpen });
        }}
      />
      <CenterQrCard
        centers={centers}
        isRotating={rotateQrMutation.isPending}
        rotatingCenterId={rotateQrMutation.variables?.centerId}
        onCopy={(center) => {
          void copyCenterToken(center.id);
        }}
        onShare={(center) => {
          void shareCenterToken(center.id);
        }}
        onRotate={(centerId) => {
          void rotateQrMutation.mutateAsync({ centerId });
        }}
      />
    </View>
  );
}
