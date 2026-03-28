import { Pressable, Text, View } from "react-native";
import { Controller, type UseFormReturn } from "react-hook-form";

import { AppButton, SectionCard, TextField } from "@/shared/components/ui";
import type { NeedsReportFormValues } from "@/types/forms";
import type { EvacuationCenter } from "@project-agap/api/supabase";

type Props = {
  form: UseFormReturn<NeedsReportFormValues>;
  centers: EvacuationCenter[];
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function NeedsReportFormCard({ form, centers, isSubmitting, onSubmit }: Props) {
  return (
    <SectionCard
      title="Report form"
      subtitle="Attach the report to a specific center when the request is tied to an active shelter."
    >
      <View className="gap-4">
        <Controller
          control={form.control}
          name="centerId"
          render={({ field, fieldState }) => (
            <View className="gap-2">
              <Text className="text-sm font-medium text-slate-700">Center assignment</Text>
              <Pressable
                onPress={() => field.onChange("")}
                className={`rounded-2xl border px-4 py-3 ${!field.value ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
              >
                <Text className="text-sm font-medium text-slate-900">Barangay-wide or unassigned</Text>
              </Pressable>
              {centers.map((center) => (
                <Pressable
                  key={center.id}
                  onPress={() => field.onChange(center.id)}
                  className={`rounded-2xl border px-4 py-3 ${field.value === center.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <Text className="text-sm font-medium text-slate-900">{center.name}</Text>
                  <Text className="mt-1 text-xs text-slate-500">{center.address}</Text>
                </Pressable>
              ))}
              {fieldState.error?.message ? (
                <Text className="text-sm text-rose-600">{fieldState.error.message}</Text>
              ) : (
                <Text className="text-sm text-slate-500">
                  Pick a center when the report belongs to a specific evacuation site.
                </Text>
              )}
            </View>
          )}
        />
        <Controller
          control={form.control}
          name="totalEvacuees"
          render={({ field, fieldState }) => (
            <TextField
              label="Total evacuees"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="0"
              keyboardType="number-pad"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="needsFoodPacks"
          render={({ field, fieldState }) => (
            <TextField
              label="Food packs needed"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="0"
              keyboardType="number-pad"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="needsWaterLiters"
          render={({ field, fieldState }) => (
            <TextField
              label="Water liters needed"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="0"
              keyboardType="number-pad"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="needsBlankets"
          render={({ field, fieldState }) => (
            <TextField
              label="Blankets needed"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="0"
              keyboardType="number-pad"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="medicalCases"
          render={({ field, fieldState }) => (
            <TextField
              label="Medical cases"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Optional medical notes"
              multiline
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextField
              label="Additional notes"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Operational context or escalation notes"
              multiline
              error={fieldState.error?.message}
            />
          )}
        />

        {form.formState.errors.root?.message ? (
          <Text className="text-sm text-rose-600">{form.formState.errors.root.message}</Text>
        ) : null}

        <AppButton label="Submit needs report" onPress={onSubmit} loading={isSubmitting} />
      </View>
    </SectionCard>
  );
}
