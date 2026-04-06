import { Pressable, Text, View } from "react-native";

import { SectionCard } from "@/shared/components/ui";

import type { CheckInMode } from "../types";

const defaultModes: CheckInMode[] = ["manual", "qr", "proxy"];

export function CheckInModeSelector({
  mode,
  onChange,
  modes = defaultModes,
  kiosk = false,
}: {
  mode: CheckInMode;
  onChange: (mode: CheckInMode) => void;
  modes?: CheckInMode[];
  kiosk?: boolean;
}) {
  if (kiosk) {
    return (
      <View className="mx-5 mt-5 rounded-[28px] border-2 border-amber-400/80 bg-neutral-900 p-6">
        <Text className="text-lg font-bold text-white">Pumili ng paraan</Text>
        <Text className="mt-1 text-base text-amber-100/90">Manual o QR — walk-in check-in</Text>
        <View className="mt-5 flex-row flex-wrap gap-4">
          {modes.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => onChange(entry)}
              className={`min-h-16 min-w-[44%] flex-1 items-center justify-center rounded-2xl border-2 px-4 ${
                mode === entry ? "border-amber-400 bg-amber-500" : "border-white/40 bg-neutral-800"
              }`}
            >
              <Text
                className={`text-center text-xl font-bold ${mode === entry ? "text-neutral-950" : "text-white"}`}
              >
                {entry === "qr" ? "QR" : entry.charAt(0).toUpperCase() + entry.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SectionCard title="Mode" subtitle="Switch between manual, QR, and proxy check-in flows.">
      <View className="flex-row gap-3">
        {modes.map((entry) => (
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
