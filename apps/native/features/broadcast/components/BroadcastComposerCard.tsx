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

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </Text>
  );
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-xl bg-slate-100 p-1">
      {options.map((option) => {
        const isActive = selected === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`flex-1 items-center rounded-lg py-2.5 ${isActive ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`text-[13px] font-semibold ${isActive ? "text-slate-900" : "text-slate-400"}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
    <View className="mx-6 mt-4 gap-5">
      {/* Language */}
      <View className="gap-2">
        <SectionLabel>Language</SectionLabel>
        <SegmentedControl
          options={languageOptions}
          selected={deliveryLanguage}
          onSelect={onChangeDeliveryLanguage}
        />
      </View>

      {/* Templates */}
      <BroadcastTemplatesCard
        deliveryLanguage={deliveryLanguage}
        form={form}
        onSelectTemplate={onSelectTemplate}
      />

      {/* Target */}
      <View className="gap-2.5">
        <SectionLabel>Target</SectionLabel>
        <SegmentedControl
          options={targetOptions}
          selected={targetMode}
          onSelect={onChangeTargetMode}
        />

        {targetMode === "purok" ? (
          <View className="flex-row flex-wrap gap-2">
            {purokOptions.map((option) => {
              const isSelected = selectedPurok === option.purok;

              return (
                <Pressable
                  key={option.purok}
                  onPress={() => onSelectPurok(option.purok)}
                  className={`rounded-lg px-3 py-2 ${isSelected ? "bg-slate-900" : "bg-slate-100"}`}
                >
                  <Text
                    className={`text-[12px] font-semibold ${isSelected ? "text-white" : "text-slate-600"}`}
                  >
                    {option.purok}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Recipient preview */}
      <View className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
        <Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Recipients
        </Text>
        <Text className="mt-1.5 text-[16px] font-bold text-slate-900">{recipientPreview.label}</Text>
        <Text className="mt-1 text-[13px] text-slate-500">
          {isLoadingAudience
            ? "Counting..."
            : `${recipientPreview.householdCount} households \u00B7 ${recipientPreview.smsReachableCount} SMS \u00B7 ${recipientPreview.appReachableCount} app`}
        </Text>
      </View>

      {/* Message */}
      <Controller
        control={form.control}
        name="message"
        render={({ field, fieldState }) => (
          <View className="gap-2">
            <SectionLabel>Message</SectionLabel>
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
              className={`min-h-32 rounded-xl px-4 py-3.5 text-[15px] leading-6 text-slate-900 ${fieldState.error ? "border border-rose-300 bg-rose-50" : "border border-slate-200 bg-slate-50"}`}
              placeholderTextColor="#94a3b8"
            />
            {fieldState.error?.message ? (
              <Text className="text-[12px] text-rose-500">{fieldState.error.message}</Text>
            ) : (
              <Text className="text-[12px] text-slate-400">
                Put the action first. Keep it to one instruction.
              </Text>
            )}
          </View>
        )}
      />

      {/* Root error */}
      {form.formState.errors.root?.message ? (
        <View className="rounded-xl bg-rose-50 px-4 py-3">
          <Text className="text-[13px] leading-5 text-rose-600">
            {form.formState.errors.root.message}
          </Text>
        </View>
      ) : null}

      {/* Submit */}
      <AppButton
        label={isSubmitting ? "Sending..." : "Send now"}
        onPress={onSubmit}
        loading={isSubmitting}
      />
    </View>
  );
}
