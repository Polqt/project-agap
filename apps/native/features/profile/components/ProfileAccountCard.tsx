import { Text, View } from "react-native";

import { AppButton, InfoRow, Pill, SectionCard } from "@/shared/components/ui";

type Props = {
  email?: string | null;
  resetFeedback: string | null;
  isResettingPassword: boolean;
  onResetPassword: () => void;
  onSignOut: () => void;
};

export function ProfileAccountCard({
  email,
  resetFeedback,
  isResettingPassword,
  onResetPassword,
  onSignOut,
}: Props) {
  return (
    <SectionCard
      title="Account actions"
      subtitle="Manage sign-in recovery for this device and end the current session when needed."
    >
      <View className="gap-4">
        <View className="gap-2">
          <Pill label="SECURED BY EMAIL" tone="info" />
          <InfoRow label="Reset email" value={email ?? "No email available"} />
        </View>

        {resetFeedback ? (
          <View className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <Text className="text-sm leading-6 text-slate-600">{resetFeedback}</Text>
          </View>
        ) : null}

        <AppButton
          label="Send password reset"
          onPress={onResetPassword}
          variant="ghost"
          loading={isResettingPassword}
          disabled={!email}
        />
        <AppButton label="Sign out" onPress={onSignOut} variant="secondary" />
      </View>
    </SectionCard>
  );
}
