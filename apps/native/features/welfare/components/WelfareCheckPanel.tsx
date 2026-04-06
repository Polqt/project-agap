import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard } from "@/shared/components/ui";

import { useWelfareCheck } from "../hooks/useWelfareCheck";

const actions: Array<{
  outcome: "safe" | "need_help" | "not_home" | "dispatch_again";
  label: string;
  labelFil: string;
  variant: "primary" | "secondary" | "danger" | "ghost";
}> = [
  { outcome: "safe", label: "Mark safe", labelFil: "Ligtas", variant: "primary" },
  { outcome: "need_help", label: "Need help", labelFil: "Kailangan ng tulong", variant: "danger" },
  { outcome: "not_home", label: "Not home", labelFil: "Walang tao", variant: "secondary" },
  { outcome: "dispatch_again", label: "Dispatch again", labelFil: "Ipadala ulit", variant: "ghost" },
];

export function WelfareCheckPanel() {
  const router = useRouter();
  const {
    households,
    isLoading,
    isRecording,
    recordingHouseholdId,
    recordOutcome,
    isOnline,
    feedback,
  } = useWelfareCheck();

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="pb-10">
      <ScreenHeader
        eyebrow="Field welfare"
        title="Welfare check"
        description="Door-to-door outcomes for households assigned to you. Record visit outcomes: Safe, Need Help, Not Home, or Dispatch Again."
        action={
          <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        }
      />

      {!isOnline ? (
        <SectionCard title="Offline">
          <Text className="text-sm leading-6 text-amber-800">
            You are offline. Outcomes are queued and will sync when you reconnect.
          </Text>
        </SectionCard>
      ) : null}

      {feedback ? (
        <SectionCard title="Update">
          <Text className="text-sm leading-6 text-slate-700">{feedback}</Text>
        </SectionCard>
      ) : null}

      {isLoading ? (
        <SectionCard>
          <Text className="text-slate-600">Loading assignments…</Text>
        </SectionCard>
      ) : null}

      {!isLoading && !households.length ? (
        <SectionCard>
          <EmptyState
            title="No welfare assignments"
            description="When an official assigns a welfare visit to you from the registry, households appear here."
          />
        </SectionCard>
      ) : null}

      {households.map((household) => (
        <SectionCard
          key={household.id}
          title={household.household_head}
          subtitle={`${household.purok} · ${household.address || "No address"}`}
          right={<Pill label={household.evacuation_status.replaceAll("_", " ")} tone="warning" />}
        >
          <Text className="mb-4 text-sm text-slate-600">
            {household.total_members} members
            {household.phone_number ? ` · ${household.phone_number}` : ""}
          </Text>
          <View className="gap-3">
            {actions.map((action) => (
              <AppButton
                key={action.outcome}
                label={`${action.label} · ${action.labelFil}`}
                variant={action.variant}
                loading={isRecording && recordingHouseholdId === household.id}
                onPress={() => void recordOutcome(household.id, action.outcome)}
              />
            ))}
          </View>
        </SectionCard>
      ))}
    </ScrollView>
  );
}
