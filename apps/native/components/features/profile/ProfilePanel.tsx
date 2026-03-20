import type { HouseholdMember, VulnerabilityFlag } from "@project-agap/api/supabase";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, type Control } from "react-hook-form";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { EmptyState } from "@/components/app/empty-state";
import { SectionCard } from "@/components/app/section-card";
import { TextField } from "@/components/app/text-field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VulnerabilityChips } from "@/components/ui/VulnerabilityChips";
import { useAuth } from "@/providers/AuthProvider";
import { haptics } from "@/services/haptics";
import { getErrorMessage } from "@/utils/format";
import { VULNERABILITY_LABELS } from "@/utils/i18n";
import { householdSchema, profileSchema } from "@/utils/validation";
import { trpc, trpcClient } from "@/utils/trpc";

type ProfileFormValues = z.input<typeof profileSchema>;
type HouseholdFormValues = z.input<typeof householdSchema>;
type HouseholdMemberFormField = {
  id: string;
  fullName: string;
  age?: string;
  vulnerabilityFlags: VulnerabilityFlag[];
  notes?: string;
};

const vulnerabilityFlags = Object.entries(VULNERABILITY_LABELS).map(([value, label]) => ({
  value: value as VulnerabilityFlag,
  label,
}));

function FlagChip({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full px-3 py-2 ${isSelected ? "bg-blue-600" : "bg-slate-100"}`}
      onPress={onPress}
    >
      <Text className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-700"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

const HouseholdMemberEditor = memo(function HouseholdMemberEditor({
  control,
  id,
  index,
  selectedFlags,
  onRemove,
  onToggleFlag,
}: {
  control: Control<any>;
  id: string;
  index: number;
  selectedFlags: VulnerabilityFlag[];
  onRemove: (index: number) => void;
  onToggleFlag: (index: number, flag: VulnerabilityFlag) => void;
}) {
  return (
    <View className="mb-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-slate-900">Member {index + 1}</Text>
        <Pressable onPress={() => onRemove(index)}>
          <Text className="text-sm font-medium text-rose-600">Remove</Text>
        </Pressable>
      </View>
      <View className="mt-4 gap-4">
        <Controller
          control={control}
          name={`members.${index}.fullName`}
          render={({ field, fieldState }) => (
            <TextField
              label="Name"
              error={fieldState.error?.message}
              onChangeText={field.onChange}
              placeholder="Household member name"
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name={`members.${index}.age`}
          render={({ field, fieldState }) => (
            <TextField
              keyboardType="number-pad"
              label="Age"
              error={fieldState.error?.message}
              onChangeText={field.onChange}
              placeholder="Optional"
              value={field.value}
            />
          )}
        />
        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-800">Vulnerability flags</Text>
          <View className="flex-row flex-wrap gap-2">
            {vulnerabilityFlags.map((flag) => (
              <FlagChip
                key={`${id}-${flag.value}`}
                isSelected={selectedFlags.includes(flag.value)}
                label={flag.label}
                onPress={() => onToggleFlag(index, flag.value)}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
});

export function ProfilePanel() {
  const { profile, refreshProfile, session, signOut } = useAuth();
  const [barangayName, setBarangayName] = useState<string>("Not set");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [householdMessage, setHouseholdMessage] = useState<string | null>(null);
  const [isEditingHousehold, setIsEditingHousehold] = useState(false);
  const householdQuery = useQuery(trpc.households.getMine.queryOptions());

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
      householdHead: profile?.full_name ?? "",
      purok: profile?.purok ?? "",
      address: "",
      phoneNumber: profile?.phone_number ?? "",
      totalMembers: 1,
      isSmsOnly: false,
      vulnerabilityFlags: [],
      members: [],
      notes: "",
    },
  });

  const fieldArray = useFieldArray({
    control: householdForm.control,
    name: "members",
  });

  useEffect(() => {
    profileForm.reset({
      fullName: profile?.full_name ?? "",
      phoneNumber: profile?.phone_number ?? "",
      purok: profile?.purok ?? "",
    });
  }, [profile?.full_name, profile?.phone_number, profile?.purok, profileForm]);

  useEffect(() => {
    const household = householdQuery.data;

    if (household) {
      householdForm.reset({
        householdHead: household.household_head,
        purok: household.purok,
        address: household.address,
        phoneNumber: household.phone_number ?? "",
        totalMembers: household.total_members,
        isSmsOnly: household.is_sms_only,
        vulnerabilityFlags: household.vulnerability_flags,
        members: household.household_members.map((member) => ({
          fullName: member.full_name,
          age: member.age?.toString() ?? "",
          vulnerabilityFlags: member.vulnerability_flags,
          notes: member.notes ?? "",
        })),
        notes: household.notes ?? "",
      });
      setIsEditingHousehold(false);
    } else {
      householdForm.reset({
        householdHead: profile?.full_name ?? "",
        purok: profile?.purok ?? "",
        address: "",
        phoneNumber: profile?.phone_number ?? "",
        totalMembers: 1,
        isSmsOnly: false,
        vulnerabilityFlags: [],
        members: [],
        notes: "",
      });
      setIsEditingHousehold(true);
    }
  }, [householdForm, householdQuery.data, profile?.full_name, profile?.phone_number, profile?.purok]);

  useEffect(() => {
    async function loadBarangayName() {
      if (!profile?.barangay_id) {
        setBarangayName("Not set");
        return;
      }

      try {
        const barangay = await trpcClient.barangays.getById.query({ id: profile.barangay_id });
        setBarangayName(barangay.name);
      } catch {
        setBarangayName("Not set");
      }
    }

    void loadBarangayName();
  }, [profile?.barangay_id]);

  const toggleFlags = useCallback(
    (
      fieldName: "vulnerabilityFlags" | `members.${number}.vulnerabilityFlags`,
      flag: VulnerabilityFlag,
    ) => {
      const currentValue = householdForm.getValues(fieldName) as VulnerabilityFlag[];
      householdForm.setValue(
        fieldName,
        currentValue.includes(flag)
          ? currentValue.filter((item) => item !== flag)
          : [...currentValue, flag],
        { shouldValidate: true },
      );
    },
    [householdForm],
  );

  const handleAddMember = useCallback(() => {
    if (fieldArray.fields.length >= 19) {
      return;
    }

    fieldArray.append({
      fullName: "",
      age: "",
      vulnerabilityFlags: [],
      notes: "",
    });
    const minimumMembers = fieldArray.fields.length + 2;
    if (householdForm.getValues("totalMembers") < minimumMembers) {
      householdForm.setValue("totalMembers", minimumMembers);
    }
  }, [fieldArray, householdForm]);

  const handleSaveProfile = profileForm.handleSubmit(async (values) => {
    try {
      setIsSavingProfile(true);
      await haptics.medium();
      await trpcClient.profile.update.mutate({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber || null,
        purok: values.purok || null,
      });
      await refreshProfile();
      await haptics.success();
      setProfileMessage("Profile updated.");
    } catch (error) {
      await haptics.error();
      setProfileMessage(getErrorMessage(error, "Hindi na-save ang profile. Subukan muli."));
    } finally {
      setIsSavingProfile(false);
    }
  });

  const handleSaveHousehold = householdForm.handleSubmit(async (values) => {
    try {
      setIsSavingHousehold(true);
      await haptics.medium();
      await trpcClient.households.register.mutate({
        householdHead: values.householdHead,
        purok: values.purok,
        address: values.address,
        phoneNumber: values.phoneNumber || null,
        totalMembers: values.totalMembers,
        isSmsOnly: values.isSmsOnly,
        vulnerabilityFlags: values.vulnerabilityFlags ?? [],
        notes: values.notes || null,
        members: (values.members ?? []).map((member) => ({
          fullName: member.fullName,
          age: member.age ? Number(member.age) : null,
          vulnerabilityFlags: member.vulnerabilityFlags ?? [],
          notes: member.notes || null,
        })),
      });
      await householdQuery.refetch();
      await haptics.success();
      setHouseholdMessage("Household saved.");
      setIsEditingHousehold(false);
    } catch (error) {
      await haptics.error();
      setHouseholdMessage(getErrorMessage(error, "Hindi na-save ang household. Subukan muli."));
    } finally {
      setIsSavingHousehold(false);
    }
  });

  const renderMember = useCallback(
    ({ item, index }: { item: HouseholdMemberFormField; index: number }) => (
      <HouseholdMemberEditor
        control={householdForm.control}
        id={item.id}
        index={index}
        selectedFlags={householdForm.watch(`members.${index}.vulnerabilityFlags`) ?? []}
        onRemove={fieldArray.remove}
        onToggleFlag={(memberIndex, flag) =>
          toggleFlags(`members.${memberIndex}.vulnerabilityFlags`, flag)
        }
      />
    ),
    [fieldArray.remove, householdForm, toggleFlags],
  );

  const renderMemberSummary = useCallback(
    ({ item }: { item: HouseholdMember }) => (
      <View className="mb-3 rounded-2xl bg-slate-50 px-4 py-4">
        <Text className="text-base font-semibold text-slate-900">{item.full_name}</Text>
        <Text className="mt-1 text-sm text-slate-600">
          {item.age !== null ? `${item.age} years old` : "No age provided"}
        </Text>
      </View>
    ),
    [],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <FlatList
        ListHeaderComponent={
          <View className="gap-5 px-6 py-6">
            <View className="gap-3">
              <Text className="text-sm font-semibold uppercase tracking-[3px] text-blue-700">
                My profile
              </Text>
              <Text className="text-4xl font-semibold text-slate-950">Resident setup</Text>
              <Text className="text-base leading-7 text-slate-600">
                Keep your personal info current and register your household for faster evacuation support.
              </Text>
            </View>

            <SectionCard
              title="Personal profile"
              description="Editable details used across alerts and check-ins."
            >
              <View className="gap-4">
                <Controller
                  control={profileForm.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Full name"
                      error={fieldState.error?.message}
                      onChangeText={field.onChange}
                      value={field.value}
                    />
                  )}
                />
                <Controller
                  control={profileForm.control}
                  name="phoneNumber"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Phone number"
                      error={fieldState.error?.message}
                      onChangeText={field.onChange}
                      value={field.value}
                    />
                  )}
                />
                <Controller
                  control={profileForm.control}
                  name="purok"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Purok"
                      error={fieldState.error?.message}
                      onChangeText={field.onChange}
                      value={field.value}
                    />
                  )}
                />
                <View className="rounded-2xl bg-slate-50 px-4 py-4">
                  <Text className="text-sm font-medium text-slate-500">Email</Text>
                  <Text className="mt-1 text-base font-semibold text-slate-900">
                    {session?.user.email ?? "No email available"}
                  </Text>
                  <Text className="mt-2 text-sm text-slate-600">{barangayName}</Text>
                </View>
                <Pressable
                  className="rounded-2xl bg-[#1A56C4] px-4 py-4"
                  onPress={() => void handleSaveProfile()}
                >
                  <Text className="text-center font-semibold text-white">
                    {isSavingProfile ? "Saving..." : "Save profile"}
                  </Text>
                </Pressable>
                {profileMessage ? <Text className="text-sm text-slate-600">{profileMessage}</Text> : null}
              </View>
            </SectionCard>

            <SectionCard
              title="Account actions"
              description="Move between role selection or sign out safely."
            >
              <View className="gap-3">
                <Pressable
                  className="rounded-2xl bg-slate-950 px-4 py-4"
                  onPress={() => router.replace("/onboarding")}
                >
                  <Text className="text-center font-semibold text-white">Switch role</Text>
                </Pressable>
                <Pressable
                  className="rounded-2xl bg-white px-4 py-4"
                  onPress={() => {
                    void signOut();
                  }}
                >
                  <Text className="text-center font-semibold text-slate-900">Sign out</Text>
                </Pressable>
              </View>
            </SectionCard>

            {householdQuery.data && !isEditingHousehold ? (
              <SectionCard
                title="Household registration"
                description="Your barangay uses this to understand evacuation needs."
              >
                <View className="gap-4">
                  <StatusBadge status={householdQuery.data.evacuation_status} />
                  <Text className="text-sm leading-6 text-slate-700">
                    {`${householdQuery.data.household_head} | ${householdQuery.data.address}`}
                  </Text>
                  <Text className="text-sm text-slate-600">
                    {`Purok: ${householdQuery.data.purok} | Barangay: ${barangayName}`}
                  </Text>
                  <VulnerabilityChips flags={householdQuery.data.vulnerability_flags} />
                  <FlatList
                    data={householdQuery.data.household_members}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMemberSummary}
                    removeClippedSubviews
                    scrollEnabled={false}
                  />
                  <Pressable
                    className="rounded-2xl bg-[#1A56C4] px-4 py-4"
                    onPress={() => setIsEditingHousehold(true)}
                  >
                    <Text className="text-center font-semibold text-white">Edit household</Text>
                  </Pressable>
                </View>
              </SectionCard>
            ) : (
              <SectionCard title="Household registration" description="One-time setup for the household registry.">
                <View className="gap-4">
                  <Controller
                    control={householdForm.control}
                    name="householdHead"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Household head"
                        error={fieldState.error?.message}
                        onChangeText={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={householdForm.control}
                    name="purok"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Purok"
                        error={fieldState.error?.message}
                        onChangeText={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={householdForm.control}
                    name="address"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Address"
                        error={fieldState.error?.message}
                        onChangeText={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={householdForm.control}
                    name="phoneNumber"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="SMS fallback number"
                        error={fieldState.error?.message}
                        onChangeText={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={householdForm.control}
                    name="notes"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Notes"
                        error={fieldState.error?.message}
                        onChangeText={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-slate-800">Total members</Text>
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        className="rounded-2xl bg-slate-200 px-4 py-3"
                        onPress={() =>
                          householdForm.setValue(
                            "totalMembers",
                            Math.max(1, householdForm.getValues("totalMembers") - 1),
                          )
                        }
                      >
                        <Text className="font-semibold text-slate-900">-</Text>
                      </Pressable>
                      <Text className="text-lg font-semibold text-slate-900">
                        {householdForm.watch("totalMembers")}
                      </Text>
                      <Pressable
                        className="rounded-2xl bg-slate-200 px-4 py-3"
                        onPress={() =>
                          householdForm.setValue(
                            "totalMembers",
                            Math.min(20, householdForm.getValues("totalMembers") + 1),
                          )
                        }
                      >
                        <Text className="font-semibold text-slate-900">+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Pressable
                    className={`rounded-2xl px-4 py-4 ${householdForm.watch("isSmsOnly") ? "bg-blue-600" : "bg-slate-200"}`}
                    onPress={() =>
                      householdForm.setValue("isSmsOnly", !householdForm.getValues("isSmsOnly"))
                    }
                  >
                    <Text
                      className={`text-center font-semibold ${householdForm.watch("isSmsOnly") ? "text-white" : "text-slate-900"}`}
                    >
                      SMS-only household
                    </Text>
                  </Pressable>
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-slate-800">Vulnerability flags</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {vulnerabilityFlags.map((flag) => (
                        <FlagChip
                          key={flag.value}
                          isSelected={(householdForm.watch("vulnerabilityFlags") ?? []).includes(flag.value)}
                          label={flag.label}
                          onPress={() => toggleFlags("vulnerabilityFlags", flag.value)}
                        />
                      ))}
                    </View>
                  </View>
                  <View className="gap-3">
                    <Text className="text-lg font-semibold text-slate-900">Household members</Text>
                    {fieldArray.fields.length > 0 ? (
                      <FlatList
                        data={fieldArray.fields as HouseholdMemberFormField[]}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMember}
                        removeClippedSubviews
                        scrollEnabled={false}
                      />
                    ) : (
                      <EmptyState
                        title="No added household members"
                        description="Add members who may need proxy check-in or special assistance."
                      />
                    )}
                    <Pressable className="rounded-2xl bg-white px-4 py-4" onPress={handleAddMember}>
                      <Text className="text-center font-semibold text-slate-900">Add member</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    className="rounded-2xl bg-[#1A56C4] px-4 py-4"
                    onPress={() => void handleSaveHousehold()}
                  >
                    <Text className="text-center font-semibold text-white">
                      {isSavingHousehold ? "Saving..." : "Save household"}
                    </Text>
                  </Pressable>
                  {householdMessage ? <Text className="text-sm text-slate-600">{householdMessage}</Text> : null}
                </View>
              </SectionCard>
            )}
          </View>
        }
        data={["profile-root"]}
        keyExtractor={(item) => item}
        renderItem={() => null}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}
