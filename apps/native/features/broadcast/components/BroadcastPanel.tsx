import { Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";
import { SectionCard } from "@/shared/components/ui";

import { BroadcastComposerCard } from "./BroadcastComposerCard";
import { BroadcastTemplatesCard } from "./BroadcastTemplatesCard";
import { RecentBroadcastsCard } from "./RecentBroadcastsCard";
import { useBroadcastPanel } from "../hooks/useBroadcastPanel";

export function BroadcastPanel() {
  const { form, feedback, broadcasts, isOnline, createBroadcastMutation, handleSubmit } = useBroadcastPanel();

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
        {!isOnline ? (
          <Text className="mt-2 text-sm text-amber-700">
            Offline mode: broadcasts are queued locally and sent once online.
          </Text>
        ) : null}
      </SectionCard>
      <BroadcastTemplatesCard form={form} />
      <BroadcastComposerCard
        form={form}
        isSubmitting={createBroadcastMutation.isPending}
        onSubmit={handleSubmit}
      />
      <RecentBroadcastsCard broadcasts={broadcasts} />
    </ScreenShell>
  );
}
