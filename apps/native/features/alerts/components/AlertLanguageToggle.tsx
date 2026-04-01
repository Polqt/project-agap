import { Pressable, Text, View } from "react-native";

import type { AlertLanguage } from "../types";

type Props = {
  value: AlertLanguage;
  onChange: (value: AlertLanguage) => void;
};

export function AlertLanguageToggle({ value, onChange }: Props) {
  return (
    <View className="flex-row rounded-full border border-slate-200 bg-slate-100 p-1">
      <Pressable
        onPress={() => onChange("english")}
        className={`rounded-full px-3 py-2 ${value === "english" ? "bg-white" : ""}`}
      >
        <Text className={`text-xs font-semibold ${value === "english" ? "text-slate-950" : "text-slate-500"}`}>
          English
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("filipino")}
        className={`rounded-full px-3 py-2 ${value === "filipino" ? "bg-white" : ""}`}
      >
        <Text
          className={`text-xs font-semibold ${value === "filipino" ? "text-slate-950" : "text-slate-500"}`}
        >
          Filipino
        </Text>
      </Pressable>
    </View>
  );
}
