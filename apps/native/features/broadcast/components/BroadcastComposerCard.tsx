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
      title="Broadcast message"
      subtitle="SMS sends English first, then Filipino. Add purok only if needed."
    >
      <View className="gap-4">
        <Controller
          control={form.control}
          name="message"
          render={({ field, fieldState }) => (
            <TextField
              label="English message (or your primary language)"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Example: Heavy rain expected. Stay indoors and monitor updates."
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
              label="Filipino version (optional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Optional Filipino translation of the message."
              multiline
              error={fieldState.error?.message}
              helperText="If provided, this is appended after the primary message."
            />
          )}
        />
        <Controller
          control={form.control}
          name="targetPurok"
          render={({ field, fieldState }) => (
            <TextField
              label="Target purok (optional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Leave blank to send to everyone."
              error={fieldState.error?.message}
            />
          )}
        />

        {form.formState.errors.root?.message ? (
          <Text className="text-sm text-rose-600">{form.formState.errors.root.message}</Text>
        ) : null}

        <AppButton label="Broadcast now" onPress={onSubmit} loading={isSubmitting} />
      </View>
    </SectionCard>
  );
}
