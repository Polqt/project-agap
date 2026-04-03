import BottomSheet from "@gorhom/bottom-sheet";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { TextInput } from "react-native";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { trpcClient } from "@/services/trpc";
import { getErrorMessage } from "@/shared/utils/errors";
import { residentSignUpSchema, type ResidentSignUpFormValues } from "@/types/forms";
import type { VulnerabilityFlag } from "@project-agap/api/supabase/types";

import { getPuroksForBarangay } from "../constants";

export function useSignUpForm() {
  const { signUpResident } = useAuth();
  const { isOnline } = useOfflineQueue();

  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);
  const [showPurokPicker, setShowPurokPicker] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState("");

  const fullNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const purokBottomSheetRef = useRef<BottomSheet>(null);

  const form = useForm<ResidentSignUpFormValues>({
    resolver: zodResolver(residentSignUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phoneNumber: "",
      barangayId: "",
      purok: "",
      address: "",
      totalMembers: 1,
      vulnerabilityFlags: [],
      isSmsOnly: false,
    },
  });

  const barangaysQuery = useQuery({
    queryKey: ["barangays", "all"],
    queryFn: async () => await trpcClient.barangays.listAll.query(),
  });

  const barangays = barangaysQuery.data ?? [];
  const filteredBarangays = useMemo(() => {
    if (!barangaySearch.trim()) return barangays;
    const query = barangaySearch.toLowerCase();
    return barangays.filter(
      (barangay) =>
        barangay.name.toLowerCase().includes(query) ||
        barangay.municipality.toLowerCase().includes(query),
    );
  }, [barangays, barangaySearch]);

  const selectedBarangayId = form.watch("barangayId");
  const selectedBarangay = barangays.find((barangay) => barangay.id === selectedBarangayId);
  const selectedPurok = form.watch("purok");

  const availablePuroks = useMemo(
    () => (selectedBarangayId ? getPuroksForBarangay(selectedBarangayId) : []),
    [selectedBarangayId],
  );

  const stepOneFields = ["fullName", "phoneNumber", "email", "password", "confirmPassword"] as const;
  const stepTwoFields = ["barangayId", "purok"] as const;

  const goNext = useCallback(async () => {
    if (step === 0) {
      const valid = await form.trigger([...stepOneFields]);
      if (valid) {
        setStep(1);
      }
      return;
    }

    if (step === 1) {
      const valid = await form.trigger([...stepTwoFields]);
      if (valid) {
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      setStep(3);
    }
  }, [form, step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep((value) => value - 1);
    }
  }, [step]);

  const handleFinalSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await signUpResident({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phoneNumber: values.phoneNumber || null,
        barangayId: values.barangayId,
        purok: values.purok,
        address: values.address || null,
        totalMembers: values.totalMembers,
        vulnerabilityFlags: values.vulnerabilityFlags,
        isSmsOnly: values.isSmsOnly,
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Unable to create your account."));
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleSkipPermissions = useCallback(() => {
    void handleFinalSubmit();
  }, [handleFinalSubmit]);

  const vulnFlags = form.watch("vulnerabilityFlags");
  const totalMembers = form.watch("totalMembers");
  const isSmsOnly = form.watch("isSmsOnly");

  const toggleVulnerabilityFlag = useCallback(
    (flag: string) => {
      const current = form.getValues("vulnerabilityFlags");
      const castFlag = flag as VulnerabilityFlag;
      const next = current.includes(castFlag)
        ? current.filter((value) => value !== flag)
        : [...current, castFlag];
      form.setValue("vulnerabilityFlags", next);
    },
    [form],
  );

  return {
    step,
    setStep,
    submitError,
    setSubmitError,
    isSubmitting,
    showBarangayPicker,
    setShowBarangayPicker,
    showPurokPicker,
    setShowPurokPicker,
    barangaySearch,
    setBarangaySearch,
    isOnline,
    form,
    goNext,
    goBack,
    handleFinalSubmit,
    handleSkipPermissions,
    toggleVulnerabilityFlag,
    barangays,
    filteredBarangays,
    selectedBarangayId,
    selectedBarangay,
    selectedPurok,
    availablePuroks,
    vulnFlags,
    totalMembers,
    isSmsOnly,
    barangaysQuery,
    fullNameRef,
    phoneRef,
    emailRef,
    passwordRef,
    confirmPasswordRef,
    addressRef,
    bottomSheetRef,
    purokBottomSheetRef,
  };
}
