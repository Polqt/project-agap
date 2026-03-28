import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Switch, Text, View } from "react-native";

import { AppButton, EmptyState, InfoRow, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";
import { profileSchema, householdSchema, type HouseholdFormValues, type ProfileFormValues } from "@/types/forms";
import { formatDateTime } from "@/shared/utils/date";
import { getErrorMessage } from "@/shared/utils/errors";

export function ProfilePanel() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name ?? "",
      phoneNumber: profile?.phone_number ?? "",
      purok: profile?.purok ?? "",
    },
  });

  const householdForm = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
      defaultValues: {
        householdHead: "",
        address: "",
        purok: profile?.purok ?? "",
        phoneNumber: profile?.phone_number ?? "",
        totalMembers: "1",
        isSmsOnly: false,
        notes: "",
      },
  });

  const barangayQuery = useQuery(
    trpc.barangays.getById.queryOptions(
      { id: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  const householdQuery = useQuery(
    trpc.households.getMine.queryOptions(undefined, {
      enabled: Boolean(profile?.barangay_id),
    }),
  );

  useEffect(() => {
    profileForm.reset({
      fullName: profile?.full_name ?? "",
      phoneNumber: profile?.phone_number ?? "",
      purok: profile?.purok ?? "",
    });
  }, [profile, profileForm]);

  useEffect(() => {
    if (!householdQuery.data) {
      householdForm.reset({
        householdHead: profile?.full_name ?? "",
        address: "",
        purok: profile?.purok ?? "",
        phoneNumber: profile?.phone_number ?? "",
        totalMembers: "1",
        isSmsOnly: false,
        notes: "",
      });
      return;
    }

    householdForm.reset({
      householdHead: householdQuery.data.household_head,
      address: householdQuery.data.address,
      purok: householdQuery.data.purok,
      phoneNumber: householdQuery.data.phone_number ?? "",
        totalMembers: String(householdQuery.data.total_members),
      isSmsOnly: householdQuery.data.is_sms_only,
      notes: householdQuery.data.notes ?? "",
    });
  }, [householdForm, householdQuery.data, profile]);

  const profileMutation = useMutation(
    trpc.profile.update.mutationOptions({
      onSuccess: async () => {
        await refreshProfile();
        setFeedback("Profile updated.");
      },
    }),
  );

  const householdMutation = useMutation(
    trpc.households.register.mutationOptions({
      onSuccess: () => {
        householdQuery.refetch();
        setFeedback("Household details saved.");
      },
    }),
  );

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    setFeedback(null);

    try {
      await profileMutation.mutateAsync({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber || null,
        purok: values.purok,
      });
    } catch (error) {
      setFeedback(getErrorMessage(error, "Unable to update your profile."));
    }
  });

  const handleHouseholdSubmit = householdForm.handleSubmit(async (values) => {
    setFeedback(null);

    try {
      await householdMutation.mutateAsync({
        householdHead: values.householdHead,
        purok: values.purok,
        address: values.address,
        phoneNumber: values.phoneNumber || null,
        totalMembers: Number(values.totalMembers),
        isSmsOnly: values.isSmsOnly,
        notes: values.notes || null,
        vulnerabilityFlags: [],
        members: [],
      });
    } catch (error) {
      setFeedback(getErrorMessage(error, "Unable to save your household."));
    }
  });

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.1 Profile setup"
        title={profile?.full_name || "Resident profile"}
        description="Edit your personal details, barangay assignment context, and household registration details after signup."
      />

      <SectionCard title="Assignment" subtitle="Your role and barangay are used to scope map data, alerts, and status pings.">
        <View className="gap-2">
          <Pill label={(profile?.role ?? "resident").toUpperCase()} tone="info" />
          <InfoRow label="Barangay" value={barangayQuery.data?.name ?? "Not assigned"} />
          <InfoRow label="Municipality" value={barangayQuery.data?.municipality ?? "Not assigned"} />
          <InfoRow label="Account created" value={formatDateTime(profile?.created_at)} />
        </View>
      </SectionCard>

      <SectionCard title="Personal information" subtitle="These details remain editable after registration, per the PRD.">
        <View className="gap-4">
          <Controller
            control={profileForm.control}
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
            control={profileForm.control}
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
            control={profileForm.control}
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

          <AppButton label="Save profile" onPress={handleProfileSubmit} loading={profileMutation.isPending} />
          {feedback ? <Text className="text-sm text-slate-600">{feedback}</Text> : null}
        </View>
      </SectionCard>

      <SectionCard title="Household registration" subtitle="This powers proxy check-ins, household search, and official accountability.">
        {householdQuery.data ? (
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
            control={householdForm.control}
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
            control={householdForm.control}
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
            control={householdForm.control}
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
            control={householdForm.control}
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
            control={householdForm.control}
            name="totalMembers"
            render={({ field, fieldState }) => (
              <TextField
                label="Total members"
                value={String(field.value)}
                onChangeText={field.onChange}
                placeholder="1"
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={householdForm.control}
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
            control={householdForm.control}
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

          <AppButton label="Save household" onPress={handleHouseholdSubmit} loading={householdMutation.isPending} />
        </View>
      </SectionCard>

      <SectionCard title="Session" subtitle="Signing out clears the local query cache and returns you to onboarding.">
        <AppButton label="Sign out" onPress={() => void signOut()} variant="secondary" />
      </SectionCard>
    </View>
  );
}
