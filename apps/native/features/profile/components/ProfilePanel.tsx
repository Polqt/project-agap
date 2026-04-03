import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfilePanel } from "../hooks/useProfilePanel";
import { HouseholdRegistrationCard } from "./HouseholdRegistrationCard";
import { LanguagePickerCard } from "./LanguagePickerCard";
import { PersonalInformationCard } from "./PersonalInformationCard";
import { ProfileAccountCard } from "./ProfileAccountCard";

type Section = "personal" | "household" | "language" | "account";

function CollapseRow({
  label,
  value,
  open,
  onPress,
}: {
  label: string;
  value?: string | null;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-slate-100 py-3.5"
    >
      <View className="flex-1">
        <Text className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </Text>
        {value ? (
          <Text className="mt-0.5 text-[14px] font-medium text-slate-700" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={open ? "chevron-up" : "chevron-down"}
        size={16}
        color="#94a3b8"
      />
    </Pressable>
  );
}

export function ProfilePanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openSection, setOpenSection] = useState<Section | null>(null);

  const {
    profile,
    accountEmail,
    profileFeedback,
    householdFeedback,
    accountFeedback,
    isResettingPassword,
    signOut,
    barangay,
    household,
    profileForm,
    householdForm,
    profileMutation,
    householdMutation,
    handleProfileSubmit,
    handleHouseholdSubmit,
    handlePasswordReset,
    fillHouseholdFromProfile,
  } = useProfilePanel();

  function toggle(section: Section) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/onboarding");
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-5 pb-5">
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Text className="text-[22px] font-bold text-blue-600">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[18px] font-bold text-slate-900" numberOfLines={1}>
              {profile?.full_name ?? "My Profile"}
            </Text>
            <Text className="text-[13px] text-slate-500">
              {barangay?.name
                ? `${barangay.name}, ${barangay.municipality}`
                : "Barangay not assigned"}
            </Text>
          </View>
          <View className="rounded-full bg-blue-50 px-3 py-1">
            <Text className="text-[11px] font-semibold uppercase text-blue-600">
              {profile?.role ?? "resident"}
            </Text>
          </View>
        </View>

        {/* Quick info pills */}
        <View className="mt-4 flex-row flex-wrap gap-2">
          {profile?.purok ? (
            <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
              <Ionicons name="location-outline" size={12} color="#64748b" />
              <Text className="text-[12px] text-slate-600">{profile.purok}</Text>
            </View>
          ) : null}
          {profile?.phone_number ? (
            <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
              <Ionicons name="call-outline" size={12} color="#64748b" />
              <Text className="text-[12px] text-slate-600">{profile.phone_number}</Text>
            </View>
          ) : null}
          {household ? (
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-50 px-3 py-1">
              <Ionicons name="home-outline" size={12} color="#059669" />
              <Text className="text-[12px] text-emerald-700">
                {household.total_members} member{household.total_members !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-3 py-1">
              <Ionicons name="warning-outline" size={12} color="#d97706" />
              <Text className="text-[12px] text-amber-700">No household</Text>
            </View>
          )}
        </View>
      </View>

      {/* Collapsible sections */}
      <View className="mx-5 rounded-2xl border border-slate-200 bg-white px-4">
        {/* Personal Info */}
        <CollapseRow
          label="Personal Information"
          value={profile?.full_name}
          open={openSection === "personal"}
          onPress={() => toggle("personal")}
        />
        {openSection === "personal" ? (
          <View className="py-3">
            <PersonalInformationCard
              form={profileForm}
              feedback={profileFeedback}
              isSaving={profileMutation.isPending}
              onSubmit={handleProfileSubmit}
            />
          </View>
        ) : null}

        {/* Household */}
        <CollapseRow
          label="Household"
          value={
            household
              ? `${household.household_head} · ${household.total_members} members`
              : "Not registered"
          }
          open={openSection === "household"}
          onPress={() => toggle("household")}
        />
        {openSection === "household" ? (
          <View className="py-3">
            <HouseholdRegistrationCard
              household={household}
              form={householdForm}
              feedback={householdFeedback}
              isSaving={householdMutation.isPending}
              onFillFromProfile={fillHouseholdFromProfile}
              onSubmit={handleHouseholdSubmit}
            />
          </View>
        ) : null}

        {/* Language */}
        <CollapseRow
          label="Language"
          value={undefined}
          open={openSection === "language"}
          onPress={() => toggle("language")}
        />
        {openSection === "language" ? (
          <View className="py-3">
            <LanguagePickerCard />
          </View>
        ) : null}

        {/* Account — last row, no bottom border */}
        <Pressable
          onPress={() => toggle("account")}
          className="flex-row items-center justify-between py-3.5"
        >
          <Text className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </Text>
          <Ionicons
            name={openSection === "account" ? "chevron-up" : "chevron-down"}
            size={16}
            color="#94a3b8"
          />
        </Pressable>
        {openSection === "account" ? (
          <View className="pb-3">
            <ProfileAccountCard
              email={accountEmail}
              resetFeedback={accountFeedback}
              isResettingPassword={isResettingPassword}
              onResetPassword={() => void handlePasswordReset()}
              onSignOut={() => void handleSignOut()}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
