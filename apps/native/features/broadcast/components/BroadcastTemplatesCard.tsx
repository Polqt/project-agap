import { Pressable, Text, View } from "react-native";
import type { UseFormReturn } from "react-hook-form";

import type { BroadcastFormValues } from "@/types/forms";

import { broadcastTemplates } from "../constants";

type Props = {
  deliveryLanguage: "english" | "filipino";
  form: UseFormReturn<BroadcastFormValues>;
  onSelectTemplate: (type: BroadcastFormValues["broadcastType"]) => void;
};

const templateLabels: Record<string, { en: string; fil: string }> = {
  evacuate_now: { en: "Evacuate", fil: "Lumikas" },
  stay_alert: { en: "Stay alert", fil: "Alerto" },
  all_clear: { en: "All clear", fil: "Ligtas" },
};

export function BroadcastTemplatesCard({ deliveryLanguage, form, onSelectTemplate }: Props) {
  const selectedType = form.watch("broadcastType");

  return (
    <View className="gap-2">
      <Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
        Quick templates
      </Text>
      <View className="flex-row gap-2">
        {broadcastTemplates.map((template) => {
          const isSelected = selectedType === template.broadcastType;
          const labels = templateLabels[template.broadcastType];
          const label = deliveryLanguage === "filipino" ? labels?.fil : labels?.en;

          return (
            <Pressable
              key={template.broadcastType}
              onPress={() => onSelectTemplate(template.broadcastType)}
              className={`flex-1 items-center rounded-lg py-2.5 ${isSelected ? "bg-slate-900" : "bg-slate-100"}`}
            >
              <Text
                className={`text-[13px] font-semibold ${isSelected ? "text-white" : "text-slate-600"}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
