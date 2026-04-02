import { Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";
import { SectionCard } from "@/shared/components/ui";

import { BroadcastComposerCard } from "./BroadcastComposerCard";
import { RecentBroadcastsCard } from "./RecentBroadcastsCard";
import { useBroadcastPanel } from "../hooks/useBroadcastPanel";

export function BroadcastPanel() {
  const { form, feedback, broadcasts, createBroadcastMutation, handleSubmit } = useBroadcastPanel();

  return (
    <ScreenShell
      eyebrow="Broadcast"
      title="Talk to everyone"
      description="Send one clear update to the whole barangay."
      feedback={feedback}
    >
      <SectionCard>
        <Text className="text-sm leading-6 text-slate-600">
          Keep it short and direct. Put the action first.
        </Text>
      </SectionCard>
      <BroadcastComposerCard
        form={form}
        isSubmitting={createBroadcastMutation.isPending}
        onSubmit={handleSubmit}
      />
      <RecentBroadcastsCard broadcasts={broadcasts} />
    </ScreenShell>
  );
}
