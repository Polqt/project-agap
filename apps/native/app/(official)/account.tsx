import { useMutation, useQuery } from "@tanstack/react-query";
import { Switch, Text, View } from "react-native";

import { Container } from "@/shared/components/container";
import { AppButton, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { getErrorMessage } from "@/shared/utils/errors";
import { useAuth } from "@/shared/hooks/useAuth";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";
import { queryClient, trpc } from "@/services/trpc";
import { useState } from "react";

export default function OfficialAccountScreen() {
  const { profile } = useAuth();
  const signOutToLogin = useSignOutRedirect("/(auth)/sign-in");
  const [accessFeedback, setAccessFeedback] = useState<string | null>(null);
  const residentAccessQueryKey = trpc.barangays.getMyResidentAccess.queryKey();
  const residentAccessQuery = useQuery(
    trpc.barangays.getMyResidentAccess.queryOptions(undefined, {
      enabled: Boolean(profile?.barangay_id),
    }),
  );

  const residentAccessMutation = useMutation(
    trpc.barangays.setResidentAccess.mutationOptions({
      onSuccess: (result) => {
        setAccessFeedback("Resident access updated.");
        queryClient.setQueryData(residentAccessQueryKey, result);
        queryClient.setQueryData(trpc.barangays.getMyEmergencyMode.queryKey(), {
          barangayId: result.barangayId,
          emergencyModeEnabled: result.residentPingEnabled || result.residentCheckInEnabled,
          alertLevel: result.alertLevel,
          activeAlertText: result.activeAlertText,
        });
      },
      onError: (error) => {
        setAccessFeedback(getErrorMessage(error, "Failed to update resident access."));
      },
    }),
  );

  const residentPingEnabled = residentAccessQuery.data?.residentPingEnabled ?? true;
  const residentCheckInEnabled = residentAccessQuery.data?.residentCheckInEnabled ?? true;

  function updateResidentAccess(next: { pingEnabled?: boolean; checkInEnabled?: boolean }) {
    setAccessFeedback(null);
    residentAccessMutation.mutate({
      pingEnabled: next.pingEnabled ?? residentPingEnabled,
      checkInEnabled: next.checkInEnabled ?? residentCheckInEnabled,
    });
  }

  return (
    <Container>
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
              description={
                residentCheckInEnabled
                  ? "Residents can open QR and manual evacuation center check-in."
                  : "Resident check-in stays locked until you enable it."
              }
              value={residentCheckInEnabled}
              disabled={residentAccessQuery.isLoading || residentAccessMutation.isPending}
              onValueChange={(value) => updateResidentAccess({ checkInEnabled: value })}
            />
          </View>
          <Text className="mt-3 text-sm leading-6 text-slate-500">
            For sudden events like earthquakes, residents can still use the emergency help button even if regular ping is off.
          </Text>
          {accessFeedback ? (
            <Text className="mt-3 text-sm leading-6 text-slate-500">{accessFeedback}</Text>
          ) : null}
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
