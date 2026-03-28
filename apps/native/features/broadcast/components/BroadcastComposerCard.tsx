import { Controller, type UseFormReturn } from "react-hook-form";
import { Text, View } from "react-native";

import { AppButton, SectionCard, TextField } from "@/shared/components/ui";
import type { BroadcastFormValues } from "@/types/forms";

type Props = {
  form: UseFormReturn<BroadcastFormValues>;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function BroadcastComposerCard({ form, isSubmitting, onSubmit }: Props) {
  return (
    <SectionCard
      title="Compose broadcast"
      subtitle="Push notifications and SMS fanout can consume the same message payload."
    >
      <View className="gap-4">
        <Controller
          control={form.control}
          name="message"
          render={({ field, fieldState }) => (
            <TextField
              label="English message"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Enter the primary message"
              multiline
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="messageFilipino"
          render={({ field, fieldState }) => (
            <TextField
              label="Filipino message"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Optional Filipino version"
              multiline
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="targetPurok"
          render={({ field, fieldState }) => (
            <TextField
              label="Target purok"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Leave blank to reach the whole barangay"
              error={fieldState.error?.message}
            />
          )}
        />

        {form.formState.errors.root?.message ? (
          <Text className="text-sm text-rose-600">{form.formState.errors.root.message}</Text>
        ) : null}

        <AppButton label="Send broadcast" onPress={onSubmit} loading={isSubmitting} />
      </View>
    </SectionCard>
  );
}
