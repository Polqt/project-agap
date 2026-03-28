import { Controller, type UseFormReturn } from "react-hook-form";
import { Switch, Text, View } from "react-native";

import { AppButton, EmptyState, SectionCard, TextField } from "@/shared/components/ui";
import type { HouseholdWithMembers } from "@project-agap/api/supabase";
import type { HouseholdFormValues } from "@/types/forms";

type Props = {
  household: HouseholdWithMembers | null | undefined;
  form: UseFormReturn<HouseholdFormValues>;
  isSaving: boolean;
  onSubmit: () => void;
};

export function HouseholdRegistrationCard({ household, form, isSaving, onSubmit }: Props) {
  return (
    <SectionCard
      title="Household registration"
      subtitle="This powers proxy check-ins, household search, and official accountability."
    >
      {household ? (
        <Text className="mb-4 text-sm leading-6 text-slate-600">
          Your household is already registered. Update the fields below whenever details change.
        </Text>
      ) : (
        <View className="mb-4">
          <EmptyState
            title="No household on file yet"
            description="Registering your household improves proxy flows and makes accountability faster for officials."
          />
        </View>
      )}

      <View className="gap-4">
        <Controller
          control={form.control}
          name="householdHead"
          render={({ field, fieldState }) => (
            <TextField
              label="Household head"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Name of household head"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="address"
          render={({ field, fieldState }) => (
            <TextField
              label="Address"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Street or landmark"
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
        <Controller
          control={form.control}
          name="phoneNumber"
          render={({ field, fieldState }) => (
            <TextField
              label="Household phone"
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
          name="totalMembers"
          render={({ field, fieldState }) => (
            <TextField
              label="Total members"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="1"
              keyboardType="number-pad"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextField
              label="Notes"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Optional household context"
              multiline
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="isSmsOnly"
          render={({ field }) => (
            <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <View className="flex-1 pr-4">
                <Text className="text-base font-medium text-slate-900">SMS-only household</Text>
                <Text className="mt-1 text-sm leading-6 text-slate-500">
                  Enable this if the household relies on SMS rather than a smartphone.
                </Text>
              </View>
              <Switch value={field.value} onValueChange={field.onChange} />
            </View>
          )}
        />

        <AppButton label="Save household" onPress={onSubmit} loading={isSaving} />
      </View>
    </SectionCard>
  );
}
