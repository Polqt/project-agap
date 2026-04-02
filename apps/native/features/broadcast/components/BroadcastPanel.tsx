import { Text, View } from "react-native";

import { ScreenShell } from "@/shared/components/screen-shell";
import { SectionCard } from "@/shared/components/ui";

import { BroadcastComposerCard } from "./BroadcastComposerCard";
import { BroadcastTemplatesCard } from "./BroadcastTemplatesCard";
import { RecentBroadcastsCard } from "./RecentBroadcastsCard";
import { useBroadcastPanel } from "../hooks/useBroadcastPanel";

export function BroadcastPanel() {
  const { form, feedback, broadcasts, createBroadcastMutation, handleSubmit } = useBroadcastPanel();

  return (
    <ScreenShell
      eyebrow="5.3.3 Broadcast"
      title="Broadcast to your barangay"
      description="Use templates or craft a custom bilingual message, then scope it to the whole barangay or a specific purok."
      feedback={feedback}
    >
      <SectionCard>
        <Text className="text-xs uppercase tracking-[1px] text-slate-500">
          Tip: Keep messages short and action-based so residents can understand quickly.
        </Text>
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
