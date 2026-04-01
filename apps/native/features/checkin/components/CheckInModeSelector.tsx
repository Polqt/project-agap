import { Pressable, Text, View } from "react-native";

import { SectionCard } from "@/shared/components/ui";

import type { CheckInMode } from "../types";

export function CheckInModeSelector({
  mode,
  onChange,
}: {
  mode: CheckInMode;
  onChange: (mode: CheckInMode) => void;
}) {
  return (
    <SectionCard title="Mode" subtitle="Switch between manual, QR, and proxy check-in flows.">
      <View className="flex-row gap-3">
        {(["manual", "qr", "proxy"] as CheckInMode[]).map((entry) => (
          <Pressable
            key={entry}
            onPress={() => onChange(entry)}
            className={`rounded-full px-4 py-3 ${mode === entry ? "bg-blue-700" : "bg-slate-200"}`}
          >
            <Text className={`text-sm font-semibold ${mode === entry ? "text-white" : "text-slate-700"}`}>
              {entry === "qr" ? "QR" : entry.charAt(0).toUpperCase() + entry.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}
