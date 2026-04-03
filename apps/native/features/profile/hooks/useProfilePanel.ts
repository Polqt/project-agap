import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/shared/hooks/useAuth";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";
import { trpc } from "@/services/trpc";
import {
  householdSchema,
  profileSchema,
  type HouseholdFormValues,
  type HouseholdMemberFormValues,
  type ProfileFormValues,
} from "@/types/forms";
import { getErrorMessage } from "@/shared/utils/errors";

export function useProfilePanel() {
  const { profile, session, signOut, refreshProfile, resetPassword } = useAuth();
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [householdFeedback, setHouseholdFeedback] = useState<string | null>(null);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
      vulnerabilityFlags: [],
      members: [],
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
        vulnerabilityFlags: [],
        members: [],
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
      vulnerabilityFlags: householdQuery.data.vulnerability_flags ?? [],
      members: householdQuery.data.household_members.map((member) => ({
        fullName: member.full_name,
        age: member.age === null ? "" : String(member.age),
        vulnerabilityFlags: member.vulnerability_flags ?? [],
        notes: member.notes ?? "",
      })),
      notes: householdQuery.data.notes ?? "",
    });
  }, [householdForm, householdQuery.data, profile]);

  const profileMutation = useMutation(
    trpc.profile.update.mutationOptions({
      onSuccess: async () => {
        await refreshProfile();
        setProfileFeedback("Profile updated.");
      },
    }),
  );

  const householdMutation = useMutation(
    trpc.households.register.mutationOptions({
      onSuccess: () => {
        void householdQuery.refetch();
        setHouseholdFeedback("Household details saved.");
      },
    }),
  );

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    setProfileFeedback(null);

    try {
      await profileMutation.mutateAsync({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber || null,
        purok: values.purok,
      });
    } catch (error) {
      setProfileFeedback(getErrorMessage(error, "Unable to update your profile."));
    }
  });

  const handleHouseholdSubmit = householdForm.handleSubmit(async (values) => {
    setHouseholdFeedback(null);

    try {
      await householdMutation.mutateAsync({
        householdHead: values.householdHead,
        purok: values.purok,
        address: values.address,
        phoneNumber: values.phoneNumber || null,
        totalMembers: Number(values.totalMembers),
        isSmsOnly: values.isSmsOnly,
        notes: values.notes || null,
        vulnerabilityFlags: values.vulnerabilityFlags,
        members: values.members.map((member: HouseholdMemberFormValues) => ({
          fullName: member.fullName,
          age: member.age ? Number(member.age) : null,
          vulnerabilityFlags: member.vulnerabilityFlags,
          notes: member.notes || null,
        })),
      });
    } catch (error) {
      setHouseholdFeedback(getErrorMessage(error, "Unable to save your household."));
    }
  });

  function fillHouseholdFromProfile() {
    householdForm.setValue("householdHead", profile?.full_name ?? "");
    householdForm.setValue("phoneNumber", profile?.phone_number ?? "");
    householdForm.setValue("purok", profile?.purok ?? "");
  }

  async function handlePasswordReset() {
    const email = session?.user.email;
    if (!email) {
      setAccountFeedback("No account email is available for password recovery.");
      return;
    }

    setAccountFeedback(null);
    setIsResettingPassword(true);

    try {
      await resetPassword(email);
      setAccountFeedback(`Password reset link sent to ${email}.`);
    } catch (error) {
      setAccountFeedback(getErrorMessage(error, "Unable to send a reset link."));
    } finally {
      setIsResettingPassword(false);
    }
  }

  return {
    profile,
    accountEmail: session?.user.email ?? null,
    profileFeedback,
    householdFeedback,
    accountFeedback,
    isResettingPassword,
    signOut,
    barangay: barangayQuery.data,
    household: householdQuery.data,
    profileForm,
    householdForm,
    profileMutation,
    householdMutation,
    handleProfileSubmit,
    handleHouseholdSubmit,
    handlePasswordReset,
    fillHouseholdFromProfile,
  };
}
