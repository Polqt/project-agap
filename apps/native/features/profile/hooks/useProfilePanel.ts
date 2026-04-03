import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/shared/hooks/useAuth";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";
import { trpc } from "@/services/trpc";
import { householdSchema, profileSchema, type HouseholdFormValues, type ProfileFormValues } from "@/types/forms";
import { getErrorMessage } from "@/shared/utils/errors";

export function useProfilePanel() {
  const { profile, refreshProfile } = useAuth();
  const signOut = useSignOutRedirect("/onboarding");
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
        void householdQuery.refetch();
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

  return {
    profile,
    feedback,
    signOut,
    barangay: barangayQuery.data,
    household: householdQuery.data,
    profileForm,
    householdForm,
    profileMutation,
    householdMutation,
    handleProfileSubmit,
    handleHouseholdSubmit,
  };
}
