import { Controller, type UseFormReturn } from "react-hook-form";
import { Text, View } from "react-native";

import { AppButton, SectionCard, TextField } from "@/shared/components/ui";
import type { NeedsReportFormValues } from "@/types/forms";

type Props = {
  form: UseFormReturn<NeedsReportFormValues>;
  centerIdPlaceholder: string;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function NeedsReportFormCard({
  form,
  centerIdPlaceholder,
  isSubmitting,
  onSubmit,
}: Props) {
  return (
    <SectionCard
      title="Report form"
      subtitle="Use the center id when the report is tied to a specific evacuation site."
    >
      <View className="gap-4">
        <Controller
          control={form.control}
          name="centerId"
          render={({ field, fieldState }) => (
            <TextField
              label="Center id"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder={centerIdPlaceholder}
              error={fieldState.error?.message}
            />
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
