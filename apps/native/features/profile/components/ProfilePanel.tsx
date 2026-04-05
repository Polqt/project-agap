import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfilePanel } from "../hooks/useProfilePanel";
import { HouseholdRegistrationCard } from "./HouseholdRegistrationCard";
import { LanguagePickerCard } from "./LanguagePickerCard";
import { PersonalInformationCard } from "./PersonalInformationCard";
import { ProfileAccountCard } from "./ProfileAccountCard";

type Section = "personal" | "household" | "language" | "account";

function AccordionRow({
  label,
  value,
  open,
  onPress,
  children,
}: {
  label: string;
  value?: string | null;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between py-4"
      >
        <View className="flex-1 pr-4">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </Text>
          {value && !open ? (
            <Text className="mt-0.5 text-[15px] font-medium text-slate-800" numberOfLines={1}>
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

      {open ? (
        <View className="pb-6">{children}</View>
      ) : null}

      {/* Divider */}
      <View className="h-px bg-slate-100" />
    </View>
  );
}

export function ProfilePanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar + Identity ── */}
      <View className="px-6 pb-8">
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Text className="text-[26px] font-bold text-slate-600">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-[22px] font-bold leading-tight text-slate-900" numberOfLines={1}>
              {profile?.full_name ?? "My Profile"}
            </Text>
            <Text className="mt-0.5 text-[14px] text-slate-500">
              {barangay?.name
                ? `${barangay.name}, ${barangay.municipality}`
                : "Barangay not assigned"}
            </Text>
          </View>
        </View>

        {/* Role + quick meta */}
        <View className="mt-5 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-blue-50 px-3 py-1.5">
            <Text className="text-[12px] font-semibold uppercase tracking-wide text-blue-600">
              {profile?.role ?? "resident"}
            </Text>
          </View>
          {profile?.purok ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
              <Ionicons name="location-outline" size={12} color="#64748b" />
              <Text className="text-[12px] font-medium text-slate-600">{profile.purok}</Text>
            </View>
          ) : null}
          {household ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5">
              <Ionicons name="people-outline" size={12} color="#059669" />
              <Text className="text-[12px] font-medium text-emerald-700">
                {household.total_members} member{household.total_members !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5">
              <Ionicons name="warning-outline" size={12} color="#d97706" />
              <Text className="text-[12px] font-medium text-amber-700">{t("profile.noHousehold")}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Accordion sections ── */}
      <View className="px-6">
        {/* Divider before first row */}
        <View className="h-px bg-slate-100" />

        <AccordionRow
          label={t("profile.personalInfo")}
          value={profile?.full_name}
          open={openSection === "personal"}
          onPress={() => toggle("personal")}
        >
          <PersonalInformationCard
            form={profileForm}
            feedback={profileFeedback}
            isSaving={profileMutation.isPending}
            onSubmit={handleProfileSubmit}
          />
        </AccordionRow>

        <AccordionRow
          label={t("profile.household")}
          value={
            household
              ? `${household.household_head} · ${household.total_members} ${t("profile.members").toLowerCase()}`
              : t("profile.noHousehold")
          }
          open={openSection === "household"}
          onPress={() => toggle("household")}
        >
          <HouseholdRegistrationCard
            household={household}
            form={householdForm}
            feedback={householdFeedback}
            isSaving={householdMutation.isPending}
            onFillFromProfile={fillHouseholdFromProfile}
            onSubmit={handleHouseholdSubmit}
          />
        </AccordionRow>

        <AccordionRow
          label={t("profile.language")}
          value={undefined}
          open={openSection === "language"}
          onPress={() => toggle("language")}
        >
          <LanguagePickerCard />
        </AccordionRow>

        {/* Account — no children card, just inline actions */}
        <View>
          <Pressable
            onPress={() => toggle("account")}
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t("profile.accountSettings")}
            </Text>
            <Ionicons
              name={openSection === "account" ? "chevron-up" : "chevron-down"}
              size={16}
              color="#94a3b8"
            />
          </Pressable>

          {openSection === "account" ? (
            <View className="pb-6 gap-3">
              {accountEmail ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] text-slate-500">Email</Text>
                  <Text className="text-[14px] font-medium text-slate-800">{accountEmail}</Text>
                </View>
              ) : null}

              {accountFeedback ? (
                <Text className="text-[13px] text-slate-500">{accountFeedback}</Text>
              ) : null}

              <Pressable
                onPress={() => void handleSignOut()}
                className="mt-2 items-center rounded-2xl bg-rose-50 py-4"
              >
                <Text className="text-[15px] font-semibold text-rose-600">{t("profile.signOut")}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
