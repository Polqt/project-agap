import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/shared/components/container";
import { AppButton, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { getErrorMessage } from "@/shared/utils/errors";
import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";
import { queryClient, trpc } from "@/services/trpc";
import { useEffect, useState } from "react";
import {
  getOfflineResidentAccess,
  getOfflineScope,
  patchOfflineResidentAccess,
  saveOfflineResidentAccess,
  syncOfflineDataForProfile,
  syncOfflineDatasets,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";
import { LastSyncedBadge } from "@/shared/components/last-synced-badge";

export default function OfficialAccountScreen() {
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const lastSyncedAt = useStore(offlineDataStore, (state) => state.lastSyncedAt);
  const insets = useSafeAreaInsets();
  const { isOnline, pendingActions, queueAction, retryFailedActions } = useOfflineQueue();
  const signOutToLogin = useSignOutRedirect("/(auth)/sign-in");
  const [accessFeedback, setAccessFeedback] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const offlineScope = getOfflineScope(profile);
  const residentAccessQueryKey = trpc.barangays.getMyResidentAccess.queryKey();
  const residentAccessQuery = useQuery({
    queryKey: ["offline", "official-resident-access", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineResidentAccess(offlineScope!.scopeId),
  });

  async function syncResidentAccess() {
    if (!offlineScope) {
      return;
    }

    await syncOfflineDatasets(offlineScope, ["residentAccess"]);
    bumpOfflineDataGeneration();
  }

  const residentAccessMutation = useMutation(
    trpc.barangays.setResidentAccess.mutationOptions({
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: residentAccessQueryKey });
        
        // Snapshot previous value
        const previousAccess = queryClient.getQueryData(residentAccessQueryKey);
        
        // Optimistically update
        if (previousAccess) {
          queryClient.setQueryData(residentAccessQueryKey, {
            ...previousAccess,
            residentPingEnabled: variables.pingEnabled,
            residentCheckInEnabled: variables.checkInEnabled,
          });
        }

        if (offlineScope) {
          await patchOfflineResidentAccess(offlineScope.scopeId, {
            residentPingEnabled: variables.pingEnabled,
            residentCheckInEnabled: variables.checkInEnabled,
          });
          bumpOfflineDataGeneration();
        }
        
        return { previousAccess };
      },
      onSuccess: async (result) => {
        setAccessFeedback("Resident access updated.");
        setShowToast(true);
        queryClient.setQueryData(residentAccessQueryKey, result);
        queryClient.setQueryData(trpc.barangays.getMyEmergencyMode.queryKey(), {
          barangayId: result.barangayId,
          emergencyModeEnabled: result.residentPingEnabled || result.residentCheckInEnabled,
          alertLevel: result.alertLevel,
          activeAlertText: result.activeAlertText,
          updatedAt: result.updatedAt,
        });
        if (offlineScope) {
          await saveOfflineResidentAccess(offlineScope.scopeId, result);
        }
        await syncResidentAccess();
      },
      onError: (error, _variables, context) => {
        setAccessFeedback(getErrorMessage(error, "Failed to update resident access."));
        setShowToast(true);
        // Rollback on error
        if (context?.previousAccess) {
          queryClient.setQueryData(residentAccessQueryKey, context.previousAccess);
        }
        void syncResidentAccess();
      },
    }),
  );

  const residentPingEnabled = residentAccessQuery.data?.residentPingEnabled ?? true;
  const residentCheckInEnabled = residentAccessQuery.data?.residentCheckInEnabled ?? true;

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  function updateResidentAccess(next: { pingEnabled?: boolean; checkInEnabled?: boolean }) {
    setAccessFeedback(null);
    setShowToast(false);
    
    // Read from query cache to get optimistic updates from pending mutations
    const cachedData = queryClient.getQueryData(residentAccessQueryKey);
    const currentPingEnabled = cachedData?.residentPingEnabled ?? true;
    const currentCheckInEnabled = cachedData?.residentCheckInEnabled ?? true;
    
    const payload = {
      pingEnabled: next.pingEnabled !== undefined ? next.pingEnabled : currentPingEnabled,
      checkInEnabled: next.checkInEnabled !== undefined ? next.checkInEnabled : currentCheckInEnabled,
      expectedUpdatedAt: residentAccessQuery.data?.updatedAt ?? null,
    };

    if (!isOnline) {
      if (offlineScope) {
        void patchOfflineResidentAccess(offlineScope.scopeId, {
          residentPingEnabled: payload.pingEnabled,
          residentCheckInEnabled: payload.checkInEnabled,
        }).then(() => bumpOfflineDataGeneration());
      }
      void retryQueueAccess(payload);
      return;
    }

    residentAccessMutation.mutate(payload);
  }

  async function retryQueueAccess(payload: {
    pingEnabled: boolean;
    checkInEnabled: boolean;
    expectedUpdatedAt: string | null;
  }) {
    await createResidentAccessQueue(payload);
    setAccessFeedback("Resident access queued offline.");
    setShowToast(true);
  }

  async function createResidentAccessQueue(payload: {
    pingEnabled: boolean;
    checkInEnabled: boolean;
    expectedUpdatedAt: string | null;
  }) {
    await queueAction(createQueuedAction("barangay.set-resident-access", payload, offlineScope));
  }

  async function handleManualSync() {
    if (!profile) {
      return;
    }

    await syncOfflineDataForProfile(profile);
    bumpOfflineDataGeneration();
    setAccessFeedback("Critical offline datasets synced.");
    setShowToast(true);
  }

  return (
    <Container>
      {/* Toast notification */}
      {showToast && accessFeedback ? (
        <View
          className="pointer-events-none absolute left-4 right-4 z-50"
          style={{ top: insets.top + 16 }}
        >
          <View
            className={`rounded-xl border px-4 py-3 shadow-lg ${
              accessFeedback.includes("Failed")
                ? "border-rose-300 bg-rose-50"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                accessFeedback.includes("Failed") ? "text-rose-900" : "text-emerald-900"
              }`}
            >
              {accessFeedback}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="flex-1 bg-slate-50 pb-8">
        <ScreenHeader
          eyebrow="Official account"
          title={profile?.full_name ?? "Barangay official"}
          description="Sign out clears this device session and returns you to the official sign-in screen."
        />
        <SectionCard
          title="Resident access"
          subtitle="Turn these on only when residents should be able to submit regular disaster activity."
        >
          <View className="mb-3 flex-row items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">Offline readiness</Text>
              <Text className="mt-1 text-xs leading-5 text-slate-500">
                SQLite is now the mobile read model. Use manual sync before deployment or field handoff.
              </Text>
            </View>
            <LastSyncedBadge lastSyncedAt={lastSyncedAt} freshnessThresholdMinutes={15} staleTresholdMinutes={45} />
          </View>
          <View className="gap-3">
            <ResidentToggleRow
              title="Resident status ping"
              description={
                residentPingEnabled
                  ? "Residents can send regular safe and need-help pings."
                  : "Residents only see the emergency help button."
              }
              value={residentPingEnabled}
              disabled={residentAccessQuery.isLoading || residentAccessMutation.isPending}
              onValueChange={(value) => updateResidentAccess({ pingEnabled: value })}
            />
            <ResidentToggleRow
              title="Resident check-in"
              description="Residents can open QR and manual evacuation center check-in."
              value={residentCheckInEnabled}
              disabled={residentAccessQuery.isLoading || residentAccessMutation.isPending}
              onValueChange={(value) => updateResidentAccess({ checkInEnabled: value })}
            />
          </View>
          <Text className="mt-3 text-sm leading-6 text-slate-500">
            For sudden events like earthquakes, residents can still use the emergency help button even if regular ping is off.
          </Text>
          <View className="mt-4 gap-3">
            <AppButton
              label={isOnline ? "Sync critical offline data" : "Sync unavailable while offline"}
              onPress={() => void handleManualSync()}
              disabled={!isOnline}
              variant="secondary"
            />
            <AppButton
              label={`Retry failed queue items (${pendingActions.filter((action) => action.failedAt !== null).length})`}
              onPress={() => void retryFailedActions()}
              variant="secondary"
            />
          </View>
        </SectionCard>
        <SectionCard title="Session" subtitle="Use this when handing the device to another user or ending your shift.">
          <AppButton label="Sign out" onPress={() => void signOutToLogin()} variant="secondary" />
          <Text className="mt-3 text-sm leading-6 text-slate-500">
            You will need your email and password to sign in again.
          </Text>
        </SectionCard>
      </View>
    </Container>
  );
}

function ResidentToggleRow({
  title,
  description,
  value,
  disabled,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-4 rounded-2xl bg-slate-50 px-4 py-4">
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-950">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-500">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#cbd5e1", true: "#2563eb" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
