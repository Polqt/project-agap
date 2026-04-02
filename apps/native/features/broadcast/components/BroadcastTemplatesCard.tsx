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
      <View className="flex-row flex-wrap gap-2">
        {broadcastTemplates.map((template) => {
          const isSelected = selectedType === template.broadcastType;
          const preview = deliveryLanguage === "filipino" ? template.messageFilipino : template.message;

          return (
            <Pressable
              key={template.broadcastType}
              onPress={() => onSelectTemplate(template.broadcastType)}
              className={`min-w-[31%] flex-1 rounded-[24px] px-4 py-4 ${isSelected ? "bg-slate-950" : "bg-slate-100"}`}
            >
              <Text className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-950"}`}>
                {template.broadcastType.replaceAll("_", " ")}
              </Text>
              <Text
                className={`mt-2 text-xs leading-5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}
                numberOfLines={3}
              >
                {preview}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
