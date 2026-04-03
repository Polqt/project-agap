import { Controller, type UseFormReturn } from "react-hook-form";
import { Text, View } from "react-native";

import { AppButton, TextField } from "@/shared/components/ui";
import type { ProfileFormValues } from "@/types/forms";

type Props = {
  form: UseFormReturn<ProfileFormValues>;
  feedback: string | null;
  isSaving: boolean;
  onSubmit: () => void;
};

export function PersonalInformationCard({ form, feedback, isSaving, onSubmit }: Props) {
  return (
    <View className="gap-4">
        <Controller
          control={form.control}
          name="fullName"
          render={({ field, fieldState }) => (
            <TextField
              label="Full name"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Juan Dela Cruz"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="phoneNumber"
          render={({ field, fieldState }) => (
            <TextField
              label="Phone number"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="09xxxxxxxxx"
              keyboardType="phone-pad"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="purok"
          render={({ field, fieldState }) => (
            <TextField
              label="Purok"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Purok 3"
              error={fieldState.error?.message}
            />
          )}
        />

        <AppButton label="Save profile" onPress={onSubmit} loading={isSaving} />
        {feedback ? <Text className="text-sm text-slate-600">{feedback}</Text> : null}
    </View>
  );
}
