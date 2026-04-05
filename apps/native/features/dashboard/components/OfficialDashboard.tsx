import { ScreenShell } from "@/shared/components/screen-shell";
import { LastSyncedBadge } from "@/shared/components/last-synced-badge";
import { useRouter } from "expo-router";
import { AppButton, SpeedDialFab, type SpeedDialAction } from "@/shared/components/ui";

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
    lastSyncedAt,
    resolveMutation,
    toggleCenterMutation,
    toggleCenter,
    rotateQrMutation,
    copyCenterToken,
    shareCenterToken,
  } = useOfficialDashboard();

  async function handleSignOut() {
    await signOut();
    router.replace("/onboarding");
  }

  const quickActions: SpeedDialAction[] = [
    {
      id: "broadcast",
      icon: "megaphone",
      label: "Quick Broadcast",
      color: "#1d4ed8",
      onPress: () => router.push({ pathname: "/broadcast", params: { tab: "send", compose: String(Date.now()) } }),
    },
    {
      id: "kiosk",
      icon: "tablet-portrait-outline",
      label: "Kiosk Mode",
      color: "#059669",
      onPress: () => router.push("/kiosk"),
    },
    {
      id: "welfare",
      icon: "footsteps-outline",
      label: "Welfare Check",
      color: "#d97706",
      onPress: () => router.push("/welfare-check"),
    },
  ];

  return (
    <ScreenShell
      title="Command"
      description="Live command surface for your barangay."
      action={<AppButton label="Sign out" onPress={() => void handleSignOut()} variant="ghost" />}
      topContent={
        <LastSyncedBadge
          lastSyncedAt={lastSyncedAt}
          freshnessThresholdMinutes={15}
          staleTresholdMinutes={45}
        />
      }
      feedback={feedback}
      isLoading={isLoading}
      loadingLabel="Refreshing dashboard data..."
      floatingAction={<SpeedDialFab actions={quickActions} />}
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
        onToggle={(centerId, isOpen) => {
          void toggleCenter(centerId, isOpen);
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
