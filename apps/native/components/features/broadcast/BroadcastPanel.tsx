import { ScrollView, Text, View } from "react-native";
import { useState } from "react";

import { DeliveryTracker } from "@/components/features/broadcast/DeliveryTracker";
import { TemplateSelector } from "@/components/features/broadcast/TemplateSelector";
import { useAuth } from "@/providers/AuthProvider";

export function BroadcastPanel() {
  const { profile } = useAuth();
  const [broadcastId, setBroadcastId] = useState<string | null>(null);

  return (
    <ScrollView className="flex-1">
      <View className="gap-5 px-6 py-6">
        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-blue-700">Broadcast</Text>
          <Text className="text-4xl font-semibold text-slate-950">Send a coordinated update</Text>
          <Text className="text-base leading-7 text-slate-600">
            Pick a template, confirm the message, then track delivery in real time.
          </Text>
        </View>
        <TemplateSelector
          barangayId={profile?.barangay_id ?? ""}
          onBroadcastCreated={setBroadcastId}
        />
        <DeliveryTracker broadcastId={broadcastId} />
      </View>
    </ScrollView>
  );
}
