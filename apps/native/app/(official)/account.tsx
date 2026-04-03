import { Text, View } from "react-native";

import { Container } from "@/shared/components/container";
import { AppButton, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";

export default function OfficialAccountScreen() {
  const { profile } = useAuth();
  const signOutToLogin = useSignOutRedirect("/(auth)/sign-in");

  return (
    <Container>
      <View className="flex-1 bg-slate-50 pb-8">
        <ScreenHeader
          eyebrow="Official account"
          title={profile?.full_name ?? "Barangay official"}
          description="Sign out clears this device session and returns you to the official sign-in screen."
        />
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
