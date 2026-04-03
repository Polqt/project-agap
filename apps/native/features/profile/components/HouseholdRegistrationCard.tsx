import { Controller, type UseFormReturn } from "react-hook-form";
import { Modal, Pressable, Share, Switch, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useState } from "react";

import { AppButton, EmptyState, Pill, SectionCard, TextField } from "@/shared/components/ui";
import type { HouseholdWithMembers } from "@project-agap/api/supabase";
import type { HouseholdFormValues } from "@/types/forms";

import { evacuationStatusMeta } from "../constants";
import { HouseholdMembersEditor } from "./HouseholdMembersEditor";
import { VulnerabilityFlagSelector } from "./VulnerabilityFlagSelector";

type Props = {
  household: HouseholdWithMembers | null | undefined;
  form: UseFormReturn<HouseholdFormValues>;
  feedback: string | null;
  isSaving: boolean;
  onFillFromProfile: () => void;
  onSubmit: () => void;
};

export function HouseholdRegistrationCard({
  household,
  form,
  feedback,
  isSaving,
  onFillFromProfile,
  onSubmit,
}: Props) {
  const statusMeta = household ? evacuationStatusMeta[household.evacuation_status] : null;
  const [showQr, setShowQr] = useState(false);
  const householdQrValue = household ? `AGAP:HH:${household.id}` : null;

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

      {household ? (
        <View className="mb-4 flex-row flex-wrap gap-2">
          {statusMeta ? <Pill label={statusMeta.label} tone={statusMeta.tone} /> : null}
          <Pill label={`${household.total_members} total members`} tone="info" />
          {household.is_sms_only ? <Pill label="SMS only" tone="warning" /> : null}
          {household.household_members.length > 0 ? (
            <Pill label={`${household.household_members.length} added members`} tone="neutral" />
          ) : null}
        </View>
      ) : null}

      {/* Family Reunification QR */}
      {household && householdQrValue ? (
        <View className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
          <Text className="text-[13px] font-semibold text-sky-800">Family Reunification QR</Text>
          <Text className="mt-1 text-[12px] leading-5 text-sky-600">
            Any barangay official can scan this to confirm your household is safe, even across different evacuation centers.
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => setShowQr(true)}
              className="flex-1 items-center rounded-xl bg-sky-600 py-2.5 active:bg-sky-700"
            >
              <Text className="text-[13px] font-semibold text-white">Show QR</Text>
            </Pressable>
            <Pressable
              onPress={() => void Share.share({ message: `Family QR Code\nScan to confirm: ${householdQrValue}` })}
              className="flex-1 items-center rounded-xl border border-sky-300 py-2.5 active:bg-sky-100"
            >
              <Text className="text-[13px] font-semibold text-sky-700">Share</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* QR Modal */}
      <Modal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/60"
          onPress={() => setShowQr(false)}
        >
          <View className="items-center rounded-3xl bg-white p-8 mx-8">
            <Text className="mb-4 text-[16px] font-bold text-slate-900">Family ID</Text>
            {householdQrValue ? (
              <QRCode value={householdQrValue} size={220} />
            ) : null}
            <Text className="mt-4 text-[12px] text-slate-500 text-center">
              {household?.household_head}
            </Text>
            <Text className="mt-1 text-[11px] text-slate-400 text-center">
              Show this to any barangay official to mark your family as located
            </Text>
          </View>
        </Pressable>
      </Modal>

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

        <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <Text className="text-sm leading-6 text-slate-600">
            Need a quick start? Use your resident profile details as the household baseline, then add the rest of your family below.
          </Text>
          <View className="mt-3">
            <AppButton label="Use my profile details" onPress={onFillFromProfile} variant="ghost" />
          </View>
        </View>

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
              helperText="Include the household head in this count."
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="vulnerabilityFlags"
          render={({ field }) => (
            <VulnerabilityFlagSelector
              label="Household priority tags"
              selectedFlags={field.value ?? []}
              onChange={field.onChange}
              helperText="These tags help officials prioritize support during evacuations and follow-up visits."
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

        <HouseholdMembersEditor form={form} />

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

        {feedback ? <Text className="text-sm leading-6 text-slate-600">{feedback}</Text> : null}
        <AppButton label="Save household" onPress={onSubmit} loading={isSaving} />
      </View>
    </SectionCard>
  );
}
