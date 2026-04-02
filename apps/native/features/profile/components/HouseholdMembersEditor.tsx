import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AppButton, EmptyState, TextField } from "@/shared/components/ui";
import type { HouseholdFormValues } from "@/types/forms";

import { VulnerabilityFlagSelector } from "./VulnerabilityFlagSelector";

type Props = {
  form: UseFormReturn<HouseholdFormValues>;
};

const emptyMember = {
  fullName: "",
  age: "",
  vulnerabilityFlags: [],
  notes: "",
} satisfies HouseholdFormValues["members"][number];

export function HouseholdMembersEditor({ form }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  });

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-950">Additional members</Text>
          <Text className="mt-1 text-sm leading-6 text-slate-500">
            Add household members beyond the household head so proxy check-ins and field visits have better context.
          </Text>
        </View>
        <View className="w-32">
          <AppButton
            label={fields.length >= 19 ? "Member limit" : "Add member"}
            onPress={() => append(emptyMember)}
            variant="ghost"
            disabled={fields.length >= 19}
          />
        </View>
      </View>

      {fields.length === 0 ? (
        <EmptyState
          title="No members added yet"
          description="The household head still counts as one member. Add others here when you want officials to see the full household roster."
        />
      ) : null}

      {fields.map((field, index) => (
        <View key={field.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <View className="mb-4 flex-row items-center justify-between gap-4">
            <View>
              <Text className="text-base font-semibold text-slate-950">Member {index + 2}</Text>
              <Text className="mt-1 text-sm text-slate-500">The household head is counted as member 1.</Text>
            </View>
            <Pressable onPress={() => remove(index)}>
              <Text className="text-sm font-semibold text-rose-700">Remove</Text>
            </Pressable>
          </View>

          <View className="gap-4">
            <Controller
              control={form.control}
              name={`members.${index}.fullName`}
              render={({ field: memberField, fieldState }) => (
                <TextField
                  label="Full name"
                  value={memberField.value ?? ""}
                  onChangeText={memberField.onChange}
                  placeholder="Family member name"
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name={`members.${index}.age`}
              render={({ field: memberField, fieldState }) => (
                <TextField
                  label="Age"
                  value={memberField.value ?? ""}
                  onChangeText={memberField.onChange}
                  placeholder="Optional"
                  keyboardType="number-pad"
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name={`members.${index}.vulnerabilityFlags`}
              render={({ field: memberField }) => (
                <VulnerabilityFlagSelector
                  label="Vulnerability tags"
                  selectedFlags={memberField.value ?? []}
                  onChange={memberField.onChange}
                  helperText="Mark only the tags that help responders prioritize this person."
                />
              )}
            />

            <Controller
              control={form.control}
              name={`members.${index}.notes`}
              render={({ field: memberField, fieldState }) => (
                <TextField
                  label="Member notes"
                  value={memberField.value ?? ""}
                  onChangeText={memberField.onChange}
                  placeholder="Optional details for responders"
                  multiline
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
