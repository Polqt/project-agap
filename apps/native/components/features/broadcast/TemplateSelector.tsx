import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { haptics } from "@/services/haptics";
import { trpcClient } from "@/utils/trpc";

const templates = [
  {
    id: "evacuate_now",
    label: "Evacuate now",
    filipino: "Lumikas na agad sa pinakamalapit na evacuation center.",
    english: "Evacuate now to the nearest evacuation center.",
  },
  {
    id: "stay_alert",
    label: "Stay alert",
    filipino: "Manatiling alerto at ihanda ang go bag.",
    english: "Stay alert and prepare your go bag.",
  },
  {
    id: "all_clear",
    label: "All clear",
    filipino: "Ligtas nang bumalik kung pinayagan na ng barangay.",
    english: "It is now safe to return if the barangay has allowed it.",
  },
] as const;

export function TemplateSelector({
  barangayId,
  onBroadcastCreated,
}: {
  barangayId: string;
  onBroadcastCreated: (broadcastId: string) => void;
}) {
  const confirmSheetRef = useRef<BottomSheet | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("evacuate_now");
  const [language, setLanguage] = useState<"fil" | "en" | "both">("fil");
  const [targetMode, setTargetMode] = useState<"barangay" | "purok">("barangay");
  const [targetPurok, setTargetPurok] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  const resolvedMessage =
    selectedTemplateId === "custom"
      ? customMessage
      : language === "en"
        ? selectedTemplate?.english ?? ""
        : language === "both"
          ? `${selectedTemplate?.filipino ?? ""}\n\n${selectedTemplate?.english ?? ""}`
          : selectedTemplate?.filipino ?? "";

  return (
    <>
      <View className="gap-4 rounded-[28px] bg-white px-5 py-5">
        <Text className="text-xl font-semibold text-slate-950">Broadcast</Text>
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <Pressable
              key={template.id}
              className={`rounded-2xl border px-4 py-4 ${
                isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
              }`}
              onPress={() => {
                void haptics.light();
                setSelectedTemplateId(template.id);
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-slate-950">{template.label}</Text>
                {isSelected ? <Ionicons color="#2563EB" name="checkmark-circle" size={20} /> : null}
              </View>
            </Pressable>
          );
        })}
        <Pressable
          className={`rounded-2xl border px-4 py-4 ${
            selectedTemplateId === "custom" ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
          }`}
          onPress={() => setSelectedTemplateId("custom")}
        >
          <Text className="text-base font-semibold text-slate-950">Custom</Text>
        </Pressable>

        {selectedTemplateId === "custom" ? (
          <TextInput
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900"
            multiline
            onChangeText={setCustomMessage}
            placeholder="Ilagay ang custom broadcast message"
            value={customMessage}
          />
        ) : null}

        <View className="flex-row gap-3">
          {(["fil", "en", "both"] as const).map((item) => (
            <Pressable
              key={item}
              className={`flex-1 rounded-2xl px-4 py-3 ${language === item ? "bg-blue-600" : "bg-slate-100"}`}
              onPress={() => setLanguage(item)}
            >
              <Text className={`text-center font-semibold ${language === item ? "text-white" : "text-slate-900"}`}>
                {item === "fil" ? "Filipino" : item === "en" ? "English" : "Both"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row gap-3">
          <Pressable
            className={`flex-1 rounded-2xl px-4 py-3 ${targetMode === "barangay" ? "bg-slate-950" : "bg-slate-100"}`}
            onPress={() => setTargetMode("barangay")}
          >
            <Text className={`text-center font-semibold ${targetMode === "barangay" ? "text-white" : "text-slate-900"}`}>
              Entire barangay
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 rounded-2xl px-4 py-3 ${targetMode === "purok" ? "bg-slate-950" : "bg-slate-100"}`}
            onPress={() => setTargetMode("purok")}
          >
            <Text className={`text-center font-semibold ${targetMode === "purok" ? "text-white" : "text-slate-900"}`}>
              Specific purok
            </Text>
          </Pressable>
        </View>

        {targetMode === "purok" ? (
          <TextInput
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900"
            onChangeText={setTargetPurok}
            placeholder="Purok name"
            value={targetPurok}
          />
        ) : null}

        <Pressable
          className="rounded-2xl bg-blue-600 px-4 py-4"
          onPress={() => confirmSheetRef.current?.snapToIndex(1)}
        >
          <Text className="text-center font-semibold text-white">Review broadcast</Text>
        </Pressable>
      </View>

      <BottomSheet index={0} ref={confirmSheetRef} snapPoints={["12%", "40%"]}>
        <View className="gap-4 px-5 pb-8">
          <Text className="text-xl font-semibold text-slate-950">Confirm broadcast</Text>
          <Text className="text-sm leading-6 text-slate-600">{resolvedMessage}</Text>
          <Text className="text-sm text-slate-500">
            {targetMode === "barangay" ? "Send to entire barangay" : `Send to ${targetPurok || "selected purok"}`}
          </Text>
          <Pressable
            className="rounded-2xl bg-slate-950 px-4 py-4"
            onPress={() =>
              void (async () => {
                try {
                  setIsSending(true);
                  await haptics.medium();
                  const broadcast = await trpcClient.broadcasts.create.mutate({
                    broadcastType: selectedTemplateId === "custom" ? "custom" : (selectedTemplateId as never),
                    message: resolvedMessage || selectedTemplate?.english || customMessage,
                    messageFilipino:
                      selectedTemplateId === "custom"
                        ? customMessage || null
                        : selectedTemplate?.filipino ?? null,
                    targetPurok: targetMode === "purok" ? targetPurok || null : null,
                  });
                  await haptics.success();
                  onBroadcastCreated(broadcast.id);
                  confirmSheetRef.current?.close();
                } finally {
                  setIsSending(false);
                }
              })()
            }
          >
            <Text className="text-center font-semibold text-white">
              {isSending ? "Sending..." : "Send broadcast"}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </>
  );
}
