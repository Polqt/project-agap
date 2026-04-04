import { useMutation, useQuery } from "@tanstack/react-query";
import { Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/shared/components/container";
import { AppButton, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { getErrorMessage } from "@/shared/utils/errors";
import { useAuth } from "@/shared/hooks/useAuth";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";
import { queryClient, trpc } from "@/services/trpc";
import { useEffect, useState } from "react";

export default function OfficialAccountScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const signOutToLogin = useSignOutRedirect("/(auth)/sign-in");
  const [accessFeedback, setAccessFeedback] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const residentAccessQueryKey = trpc.barangays.getMyResidentAccess.queryKey();
  const residentAccessQuery = useQuery(
    trpc.barangays.getMyResidentAccess.queryOptions(undefined, {
      enabled: Boolean(profile?.barangay_id),
    }),
  );

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
        
        return { previousAccess };
      },
      onSuccess: (result) => {
        setAccessFeedback("Resident access updated.");
        setShowToast(true);
        queryClient.setQueryData(residentAccessQueryKey, result);
        queryClient.setQueryData(trpc.barangays.getMyEmergencyMode.queryKey(), {
          barangayId: result.barangayId,
          emergencyModeEnabled: result.residentPingEnabled || result.residentCheckInEnabled,
          alertLevel: result.alertLevel,
          activeAlertText: result.activeAlertText,
        });
      },
      onError: (error, _variables, context) => {
        setAccessFeedback(getErrorMessage(error, "Failed to update resident access."));
        setShowToast(true);
        // Rollback on error
        if (context?.previousAccess) {
          queryClient.setQueryData(residentAccessQueryKey, context.previousAccess);
        }
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
    
    residentAccessMutation.mutate({
      pingEnabled: next.pingEnabled !== undefined ? next.pingEnabled : currentPingEnabled,
      checkInEnabled: next.checkInEnabled !== undefined ? next.checkInEnabled : currentCheckInEnabled,
    });
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
