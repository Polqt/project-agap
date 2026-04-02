import { useRouter } from "expo-router";
import { View } from "react-native";

import { ScreenHeader } from "@/shared/components/ui";

import { PersonalInformationCard } from "./PersonalInformationCard";
import { ProfileAssignmentCard } from "./ProfileAssignmentCard";
import { HouseholdRegistrationCard } from "./HouseholdRegistrationCard";
import { ProfileAccountCard } from "./ProfileAccountCard";
import { useProfilePanel } from "../hooks/useProfilePanel";

export function ProfilePanel() {
  const router = useRouter();
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

  async function handleSignOut() {
    await signOut();
    router.replace("/onboarding");
  }

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.1 Profile setup"
        title={profile?.full_name || "Resident profile"}
        description="Edit your personal details, keep your household roster current, and manage account recovery from one place."
      />

      <ProfileAssignmentCard
        profile={profile}
        barangayName={barangay?.name}
        municipality={barangay?.municipality}
      />
      <PersonalInformationCard
        form={profileForm}
        feedback={profileFeedback}
        isSaving={profileMutation.isPending}
        onSubmit={handleProfileSubmit}
      />
      <HouseholdRegistrationCard
        household={household}
        form={householdForm}
        feedback={householdFeedback}
        isSaving={householdMutation.isPending}
        onFillFromProfile={fillHouseholdFromProfile}
        onSubmit={handleHouseholdSubmit}
      />
      <ProfileAccountCard
        email={accountEmail}
        resetFeedback={accountFeedback}
        isResettingPassword={isResettingPassword}
        onResetPassword={() => void handlePasswordReset()}
        onSignOut={() => void handleSignOut()}
      />
    </View>
  );
}
