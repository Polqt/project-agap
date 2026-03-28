import { Text, View } from "react-native";

import { ScreenHeader, SectionCard } from "@/shared/components/ui";

import { BroadcastComposerCard } from "./BroadcastComposerCard";
import { BroadcastTemplatesCard } from "./BroadcastTemplatesCard";
import { RecentBroadcastsCard } from "./RecentBroadcastsCard";
import { useBroadcastPanel } from "../hooks/useBroadcastPanel";

export function BroadcastPanel() {
  const { form, feedback, broadcasts, createBroadcastMutation, handleSubmit } = useBroadcastPanel();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.3 Broadcast"
        title="Broadcast to your barangay"
        description="Use templates or craft a custom bilingual message, then scope it to the whole barangay or a specific purok."
      />
      {feedback ? (
        <SectionCard>
          <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
        </SectionCard>
      ) : null}
      <BroadcastTemplatesCard form={form} />
      <BroadcastComposerCard
        form={form}
        isSubmitting={createBroadcastMutation.isPending}
        onSubmit={handleSubmit}
      />
      <RecentBroadcastsCard broadcasts={broadcasts} />
    </View>
  );
}
