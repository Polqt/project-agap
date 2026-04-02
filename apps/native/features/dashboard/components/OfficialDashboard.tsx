import { ScreenShell } from "@/shared/components/screen-shell";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { AppButton, ScreenHeader, SectionCard } from "@/shared/components/ui";

import { CenterQrCard } from "./CenterQrCard";
import { CenterStatusCard } from "./CenterStatusCard";
import { DashboardSummaryCards } from "./DashboardSummaryCards";
import { PriorityQueueCard } from "./PriorityQueueCard";
import { UnaccountedHouseholdsCard } from "./UnaccountedHouseholdsCard";
import { WelfareDispatchCard } from "./WelfareDispatchCard";
import { useOfficialDashboard } from "../hooks/useOfficialDashboard";

export function OfficialDashboard() {
  const router = useRouter();
  const {
    signOut,
    feedback,
    isLoading,
    summary,
    unresolvedPings,
    centers,
    unaccountedHouseholds,
    welfareDispatch,
    resolveMutation,
    toggleCenterMutation,
    rotateQrMutation,
    copyCenterToken,
    shareCenterToken,
  } = useOfficialDashboard();

  async function handleSignOut() {
    await signOut();
    router.replace("/onboarding");
  }

  return (
    <ScreenShell
      eyebrow="Official dashboard"
      title="Command view"
      action={<AppButton label="Sign out" onPress={() => void handleSignOut()} variant="ghost" />}
      feedback={feedback}
      isLoading={isLoading}
      loadingLabel="Refreshing dashboard data..."
    >
      <DashboardSummaryCards summary={summary} />
      <PriorityQueueCard
        unresolvedPings={unresolvedPings}
        isResolving={resolveMutation.isPending}
        resolvingPingId={resolveMutation.variables?.pingId}
        onResolve={(pingId) => {
          void resolveMutation.mutateAsync({ pingId });
        }}
      />
      <WelfareDispatchCard items={welfareDispatch} />
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
    </ScreenShell>
  );
}
