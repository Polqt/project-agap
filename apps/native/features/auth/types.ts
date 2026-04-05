import type BottomSheet from "@gorhom/bottom-sheet";
import type { UseFormReturn } from "react-hook-form";
import type { RefObject } from "react";
import type { TextInput } from "react-native";
import type { ResidentSignUpFormValues } from "@/types/forms";

export type BarangayOption = {
  id: string;
  name: string;
  municipality: string;
  province: string;
};

export type SignUpRefs = {
  fullNameRef: RefObject<TextInput | null>;
  phoneRef: RefObject<TextInput | null>;
  emailRef: RefObject<TextInput | null>;
  passwordRef: RefObject<TextInput | null>;
  confirmPasswordRef: RefObject<TextInput | null>;
  addressRef: RefObject<TextInput | null>;
  bottomSheetRef: RefObject<BottomSheet | null>;
  purokBottomSheetRef: RefObject<BottomSheet | null>;
};

export type SignUpFormState = {
  step: number;
  submitError: string | null;
  isSubmitting: boolean;
  showBarangayPicker: boolean;
  showPurokPicker: boolean;
  barangaySearch: string;
  isOnline: boolean;
  form: UseFormReturn<ResidentSignUpFormValues>;
  barangays: BarangayOption[];
  filteredBarangays: BarangayOption[];
  selectedBarangay: BarangayOption | undefined;
  selectedBarangayId: string;
  selectedPurok: string;
  availablePuroks: readonly string[];
  vulnFlags: string[];
  totalMembers: number;
  isSmsOnly: boolean;
};

export type SignUpFormActions = {
  goNext: () => Promise<void>;
  goBack: () => void;
  handleFinalSubmit: () => Promise<void>;
  handleSkipPermissions: () => void;
  handlePermissionsAndSubmit: () => Promise<void>;
  setShowBarangayPicker: (value: boolean) => void;
  setShowPurokPicker: (value: boolean) => void;
  setBarangaySearch: (value: string) => void;
  toggleVulnerabilityFlag: (flag: string) => void;
  setSubmitError: (value: string | null) => void;
};
