import { Controller, type UseFormReturn } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";

import { AppButton } from "@/shared/components/ui";
import type { BroadcastFormValues } from "@/types/forms";

import { BroadcastTemplatesCard } from "./BroadcastTemplatesCard";

type AudiencePurok = {
  purok: string;
  householdCount: number;
  smsReachableCount: number;
  appReachableCount: number;
};

type Props = {
  deliveryLanguage: "english" | "filipino";
  form: UseFormReturn<BroadcastFormValues>;
  isLoadingAudience: boolean;
  isSubmitting: boolean;
  purokOptions: AudiencePurok[];
  recipientPreview: {
    label: string;
    householdCount: number;
    smsReachableCount: number;
    appReachableCount: number;
  };
  targetMode: "all" | "purok";
  onChangeDeliveryLanguage: (value: "english" | "filipino") => void;
  onChangeTargetMode: (value: "all" | "purok") => void;
  onSelectPurok: (value: string) => void;
  onSelectTemplate: (type: BroadcastFormValues["broadcastType"]) => void;
  onSubmit: () => void;
};

const languageOptions = [
  { value: "english" as const, label: "English" },
  { value: "filipino" as const, label: "Filipino" },
];

const targetOptions = [
  { value: "all" as const, label: "All barangay" },
  { value: "purok" as const, label: "Per purok" },
];

export function BroadcastComposerCard({
  deliveryLanguage,
  form,
  isLoadingAudience,
  isSubmitting,
  purokOptions,
  recipientPreview,
  targetMode,
  onChangeDeliveryLanguage,
  onChangeTargetMode,
  onSelectPurok,
  onSelectTemplate,
  onSubmit,
}: Props) {
  const selectedPurok = form.watch("targetPurok") ?? "";

  return (
    <View className="mx-5 mt-5 rounded-[34px] bg-white px-5 py-5 shadow-sm">
      <Text className="text-lg font-semibold text-slate-950">Send</Text>
      <Text className="mt-1 text-sm leading-6 text-slate-500">
        One tap publishes to the resident feed and starts SMS fan-out immediately.
      </Text>

      <View className="mt-5 gap-5">
        <View className="gap-3">
          <Text className="text-sm font-medium text-slate-700">Language</Text>
          <View className="flex-row rounded-[20px] bg-slate-100 p-1">
            {languageOptions.map((option) => {
              const isActive = deliveryLanguage === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => onChangeDeliveryLanguage(option.value)}
                  className={`flex-1 rounded-2xl px-4 py-3 ${isActive ? "bg-white" : ""}`}
                >
                  <Text className={`text-center text-sm font-semibold ${isActive ? "text-slate-950" : "text-slate-500"}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <BroadcastTemplatesCard
          deliveryLanguage={deliveryLanguage}
          form={form}
          onSelectTemplate={onSelectTemplate}
        />

        <View className="gap-3">
          <Text className="text-sm font-medium text-slate-700">Target</Text>
          <View className="flex-row rounded-[20px] bg-slate-100 p-1">
            {targetOptions.map((option) => {
              const isActive = targetMode === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => onChangeTargetMode(option.value)}
                  className={`flex-1 rounded-2xl px-4 py-3 ${isActive ? "bg-white" : ""}`}
                >
                  <Text className={`text-center text-sm font-semibold ${isActive ? "text-slate-950" : "text-slate-500"}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {targetMode === "purok" ? (
            <View className="flex-row flex-wrap gap-2">
              {purokOptions.map((option) => {
                const isSelected = selectedPurok === option.purok;

                return (
                  <Pressable
                    key={option.purok}
                    onPress={() => onSelectPurok(option.purok)}
                    className={`rounded-full px-4 py-2 ${isSelected ? "bg-slate-950" : "bg-slate-100"}`}
                  >
                    <Text className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-700"}`}>
                      {option.purok}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View className="rounded-[26px] bg-slate-100 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.1px] text-slate-500">Recipient preview</Text>
          <Text className="mt-2 text-lg font-semibold text-slate-950">{recipientPreview.label}</Text>
          <Text className="mt-1 text-sm leading-6 text-slate-600">
            {isLoadingAudience
              ? "Counting recipients..."
              : `${recipientPreview.householdCount} households / ${recipientPreview.smsReachableCount} SMS reachable / ${recipientPreview.appReachableCount} app recipients`}
          </Text>
        </View>

        <Controller
          control={form.control}
          name="message"
          render={({ field, fieldState }) => (
            <View className="gap-2">
              <Text className="text-sm font-medium text-slate-700">Message</Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={
                  deliveryLanguage === "filipino"
                    ? "Halimbawa: Lumikas na sa pinakamalapit na evacuation center."
                    : "Example: Evacuate now to the nearest open evacuation center."
                }
                multiline
                textAlignVertical="top"
                className={`min-h-36 rounded-[28px] px-4 py-4 text-base text-slate-950 ${fieldState.error ? "bg-rose-50" : "bg-slate-100"}`}
                placeholderTextColor="#94a3b8"
              />
              {fieldState.error?.message ? (
                <Text className="text-sm text-rose-600">{fieldState.error.message}</Text>
              ) : (
                <Text className="text-sm text-slate-500">Put the action first and keep the message to one direct instruction.</Text>
              )}
            </View>
          )}
        />

        {form.formState.errors.root?.message ? (
          <Text className="rounded-[20px] bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            {form.formState.errors.root.message}
          </Text>
        ) : null}

        <AppButton
          label={isSubmitting ? "Sending..." : "Send now"}
          onPress={onSubmit}
          loading={isSubmitting}
        />
      </View>
    </View>
  );
}
