import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/shared/hooks/useAuth";
import {
  getOfflineBarangay,
  getOfflineHousehold,
  getOfflineScope,
  patchOfflineProfile,
  saveOfflineHousehold,
  syncOfflineDataForProfile,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { runWithNetworkResilience } from "@/services/networkResilience";
import { useSignOutRedirect } from "@/shared/hooks/useSignOutRedirect";
import { trpc } from "@/services/trpc";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import {
  householdSchema,
  profileSchema,
  type HouseholdFormValues,
  type HouseholdMemberFormValues,
  type ProfileFormValues,
} from "@/types/forms";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { offlineDataStore, bumpOfflineDataGeneration } from "@/stores/offline-data-store";

export function useProfilePanel() {
  const { profile, session, signOut, refreshProfile, resetPassword } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, isWeakConnection, queueAction } = useOfflineQueue();
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [householdFeedback, setHouseholdFeedback] = useState<string | null>(null);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const offlineScope = getOfflineScope(profile);

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
    {
      queryKey: ["offline", "barangay", offlineScope?.scopeId, offlineGeneration],
      enabled: Boolean(offlineScope?.scopeId),
      queryFn: async () => getOfflineBarangay(offlineScope!.scopeId),
    },
  );

  const householdQuery = useQuery(
    {
      queryKey: ["offline", "household", offlineScope?.scopeId, offlineGeneration],
      enabled: Boolean(offlineScope?.scopeId),
      queryFn: async () => getOfflineHousehold(offlineScope!.scopeId),
    },
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
        if (profile) {
          await syncOfflineDataForProfile(profile);
          bumpOfflineDataGeneration();
        }
        setProfileFeedback("Profile updated.");
      },
    }),
  );

  const householdMutation = useMutation(
    trpc.households.register.mutationOptions({
      onSuccess: async (household) => {
        if (offlineScope) {
          await saveOfflineHousehold(offlineScope.scopeId, household);
        }
        if (profile) {
          await syncOfflineDataForProfile(profile);
        }
        bumpOfflineDataGeneration();
        setHouseholdFeedback("Household details saved.");
      },
    }),
  );

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    setProfileFeedback(null);
    const payload = {
      fullName: values.fullName,
      phoneNumber: values.phoneNumber || null,
      purok: values.purok,
    };
    const queuedAction = createQueuedAction("profile.update", payload, offlineScope);
    const livePayload = queuedAction.payload;

    try {
      if (!isOnline) {
        if (offlineScope) {
          await patchOfflineProfile(offlineScope.scopeId, {
            full_name: payload.fullName,
            phone_number: payload.phoneNumber,
            purok: payload.purok,
          });
          bumpOfflineDataGeneration();
        }

        await queueAction(queuedAction);
        setProfileFeedback("Profile update queued offline.");
        return;
      }

      await runWithNetworkResilience(
        "Profile update",
        () => profileMutation.mutateAsync(livePayload),
        { isWeakConnection },
      );
    } catch (error) {
      if (isOfflineLikeError(error)) {
        if (offlineScope) {
          await patchOfflineProfile(offlineScope.scopeId, {
            full_name: payload.fullName,
            phone_number: payload.phoneNumber,
            purok: payload.purok,
          });
          bumpOfflineDataGeneration();
        }

        await queueAction(queuedAction);
        setProfileFeedback(
          isWeakConnection
            ? "Weak signal blocked live delivery, so the profile update was staged for retry."
            : "Connection dropped. Profile update queued for auto-sync.",
        );
        return;
      }

      setProfileFeedback(getErrorMessage(error, "Unable to update your profile."));
    }
  });

  const handleHouseholdSubmit = householdForm.handleSubmit(async (values) => {
    setHouseholdFeedback(null);
    const payload = {
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
    };
    const queuedAction = createQueuedAction("household.register", payload, offlineScope);
    const livePayload = queuedAction.payload;

    try {
      if (!isOnline) {
        await queueAction(queuedAction);
        setHouseholdFeedback("Household details queued offline.");
        return;
      }

      await runWithNetworkResilience(
        "Household registration",
        () => householdMutation.mutateAsync(livePayload),
        { isWeakConnection },
      );
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(queuedAction);
        setHouseholdFeedback(
          isWeakConnection
            ? "Weak signal blocked live delivery, so household details were staged for retry."
            : "Connection dropped. Household details queued for auto-sync.",
        );
        return;
      }

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
