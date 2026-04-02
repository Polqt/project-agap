import { Pressable, Text, View } from "react-native";
import type { UseFormReturn } from "react-hook-form";

import { SectionCard } from "@/shared/components/ui";
import type { BroadcastFormValues } from "@/types/forms";

import { broadcastTemplates } from "../constants";

export function BroadcastTemplatesCard({ form }: { form: UseFormReturn<BroadcastFormValues> }) {
  const selectedType = form.watch("broadcastType");

  return (
    <SectionCard title="Quick templates" subtitle="Tap one to auto-fill your message.">
      <View className="gap-3">
        {broadcastTemplates.map((template) => {
          const isSelected = selectedType === template.broadcastType;
          return (
            <Pressable
              key={template.broadcastType}
              onPress={() => {
                form.setValue("broadcastType", template.broadcastType);
                form.setValue("message", template.message);
                form.setValue("messageFilipino", template.messageFilipino);
              }}
              className={`rounded-2xl border px-4 py-4 ${isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
            >
              <Text className="text-base font-semibold text-slate-950">
                {template.broadcastType.replace("_", " ").toUpperCase()}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600" numberOfLines={3}>
                {template.message}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SectionCard>
  );
}
