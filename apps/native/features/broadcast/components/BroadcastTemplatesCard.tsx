import { Pressable, Text, View } from "react-native";
import type { UseFormReturn } from "react-hook-form";

import type { BroadcastFormValues } from "@/types/forms";

import { broadcastTemplates } from "../constants";

type Props = {
  deliveryLanguage: "english" | "filipino";
  form: UseFormReturn<BroadcastFormValues>;
  onSelectTemplate: (type: BroadcastFormValues["broadcastType"]) => void;
};

export function BroadcastTemplatesCard({ deliveryLanguage, form, onSelectTemplate }: Props) {
  const selectedType = form.watch("broadcastType");

  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-slate-700">Quick templates</Text>
      <View className="flex-row gap-2">
        {broadcastTemplates.map((template) => {
          const isSelected = selectedType === template.broadcastType;
          const label = deliveryLanguage === "filipino"
            ? template.broadcastType === "evacuate_now"
              ? "Lumikas"
              : template.broadcastType === "stay_alert"
                ? "Alerto"
                : "Ligtas"
            : template.broadcastType === "evacuate_now"
              ? "Evacuate"
              : template.broadcastType === "stay_alert"
                ? "Stay alert"
                : "All clear";

          return (
            <Pressable
              key={template.broadcastType}
              onPress={() => onSelectTemplate(template.broadcastType)}
              className={`flex-1 rounded-full px-4 py-3 ${isSelected ? "bg-slate-950" : "bg-slate-100"}`}
            >
              <Text className={`text-center text-sm font-semibold ${isSelected ? "text-white" : "text-slate-950"}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
