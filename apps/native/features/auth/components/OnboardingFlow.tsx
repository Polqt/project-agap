import { useStore } from "@tanstack/react-store";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/shared/hooks/useAuth";
import { AppButton, Pill, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { appShellStore, setSelectedRole } from "@/stores/app-shell-store";

const roleCards = [
  {
    role: "resident" as const,
    title: "Resident",
    subtitle: "Send your status in one tap, find the nearest evacuation center, and keep your household visible during emergencies.",
    actionLabel: "Continue as Resident",
  },
  {
    role: "official" as const,
    title: "Barangay Official",
    subtitle: "Monitor accountability, coordinate broadcasts, and manage live evacuation operations for your barangay.",
    actionLabel: "Continue as Official",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const { isLoading, isAuthenticated, role } = useAuth();
  const selectedRole = useStore(appShellStore, (state) => state.selectedRole);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role) {
      return;
    }

    router.replace(role === "official" ? "/(official)/dashboard" : "/(resident)/status");
  }, [isAuthenticated, isLoading, role, router]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="grow pb-8"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Agap"
        title="Handa. Ligtas. Agap."
        description="Pick the role that matches how you use the app. Your screens, actions, and navigation will adapt immediately."
      />

      <View className="gap-0 pb-8">
        {roleCards.map((card) => {
          const isActive = selectedRole === card.role;

          return (
            <Pressable
              key={card.role}
              onPress={() => {
                setSelectedRole(card.role);
              }}
            >
              <SectionCard
                title={card.title}
                subtitle={card.subtitle}
                right={<Pill label={card.role === "resident" ? "Community side" : "Command side"} tone={isActive ? "info" : "neutral"} />}
              >
                <View className={`rounded-3xl px-4 py-5 ${card.role === "resident" ? "bg-emerald-50" : "bg-amber-50"}`}>
                  <Text className="text-2xl font-semibold text-slate-950">
                    {card.role === "resident" ? "Ping, map, and check-in" : "Dashboard, registry, and broadcast"}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">
                    {card.role === "resident"
                      ? "Ideal for residents and households that need a fast safety workflow."
                      : "Designed for barangay officials coordinating response on the ground."}
                  </Text>
                </View>
                <View className="mt-4">
                  <AppButton
                    label={card.actionLabel}
                    onPress={() => {
                      setSelectedRole(card.role);
                      router.push(card.role === "official" ? "/(auth)/sign-in" : "/(auth)/sign-up");
                    }}
                  />
                </View>
              </SectionCard>
            </Pressable>
          );
        })}

        <SectionCard title="Session persistence" subtitle="Once you are signed in, Agap keeps your session safely stored on the device until you sign out.">
          <Text className="text-sm leading-6 text-slate-600">
            Returning residents can sign in from the resident sign-up screen. Officials use the dedicated sign-in flow for pre-created accounts.
          </Text>
        </SectionCard>
      </View>
    </ScrollView>
  );
}
