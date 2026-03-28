import { View } from "react-native";

import { ScreenHeader, SectionCard, AppButton } from "@/shared/components/ui";

import { PersonalInformationCard } from "./PersonalInformationCard";
import { ProfileAssignmentCard } from "./ProfileAssignmentCard";
import { HouseholdRegistrationCard } from "./HouseholdRegistrationCard";
import { useProfilePanel } from "../hooks/useProfilePanel";

export function ProfilePanel() {
  const {
    profile,
    feedback,
    signOut,
    barangay,
    household,
    profileForm,
    householdForm,
    profileMutation,
    householdMutation,
    handleProfileSubmit,
    handleHouseholdSubmit,
  } = useProfilePanel();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.1 Profile setup"
        title={profile?.full_name || "Resident profile"}
        description="Edit your personal details, barangay assignment context, and household registration details after signup."
      />

      <ProfileAssignmentCard
        profile={profile}
        barangayName={barangay?.name}
        municipality={barangay?.municipality}
      />
      <PersonalInformationCard
        form={profileForm}
        feedback={feedback}
        isSaving={profileMutation.isPending}
        onSubmit={handleProfileSubmit}
      />
      <HouseholdRegistrationCard
        household={household}
        form={householdForm}
        isSaving={householdMutation.isPending}
        onSubmit={handleHouseholdSubmit}
      />

      <SectionCard title="Session" subtitle="Signing out clears the local query cache and returns you to onboarding.">
        <AppButton label="Sign out" onPress={() => void signOut()} variant="secondary" />
      </SectionCard>
    </View>
  );
}
