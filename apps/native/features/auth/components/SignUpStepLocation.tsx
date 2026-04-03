import { Ionicons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";
import type { RefObject } from "react";
import { Controller } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import type { UseFormReturn } from "react-hook-form";
import type { TextInput } from "react-native";

import { AppButton, TextField } from "@/shared/components/ui";
import type { ResidentSignUpFormValues } from "@/types/forms";

import { SignUpStepHeader } from "./SignUpShared";

type Props = {
  form: UseFormReturn<ResidentSignUpFormValues>;
  selectedBarangay: { id: string; name: string; municipality: string; province: string } | undefined;
  selectedBarangayId: string;
  selectedPurok: string;
  availablePuroks: readonly string[];
  goNext: () => Promise<void>;
  setShowBarangayPicker: (value: boolean) => void;
  setBarangaySearch: (value: string) => void;
  setShowPurokPicker: (value: boolean) => void;
  addressRef: RefObject<TextInput | null>;
  bottomSheetRef: RefObject<BottomSheet | null>;
  purokBottomSheetRef: RefObject<BottomSheet | null>;
  showBarangayPicker: boolean;
};

export function SignUpStepLocation({
  form,
  selectedBarangay,
  selectedPurok,
  availablePuroks,
  goNext,
  setShowBarangayPicker,
  setBarangaySearch,
  setShowPurokPicker,
  addressRef,
  bottomSheetRef,
  purokBottomSheetRef,
}: Props) {
  const hasPuroks = availablePuroks.length > 0;

  return (
    <View className="gap-5">
      <SignUpStepHeader step={1} title="Your location" />

      <View className="gap-2">
        <Text className="text-[13px] font-medium text-slate-600">Barangay</Text>
        <Pressable
          onPress={() => {
            setShowBarangayPicker(true);
            setBarangaySearch("");
            setTimeout(() => bottomSheetRef.current?.expand(), 100);
          }}
          className="min-h-11 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5"
        >
          <Text className={`text-[15px] ${selectedBarangay ? "text-slate-900" : "text-slate-400"}`}>
            {selectedBarangay?.name ?? "Select barangay"}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </Pressable>
        {form.formState.errors.barangayId?.message ? (
          <Text className="text-[12px] text-rose-500">
            {form.formState.errors.barangayId.message}
          </Text>
        ) : (
          <Text className="text-[11px] text-slate-400">
            Only barangays enrolled in Agap are shown.
          </Text>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-[13px] font-medium text-slate-600">Purok / Sitio</Text>
        {hasPuroks ? (
          <Pressable
            onPress={() => {
              if (!selectedBarangay) return;
              setShowPurokPicker(true);
              setTimeout(() => purokBottomSheetRef.current?.expand(), 100);
            }}
            className="min-h-11 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5"
          >
            <Text
              className={`text-[15px] ${selectedPurok ? "text-slate-900" : "text-slate-400"}`}
            >
              {selectedPurok || "Select purok / sitio"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </Pressable>
        ) : (
          <Controller
            control={form.control}
            name="purok"
            render={({ field, fieldState }) => (
              <TextField
                label=""
                value={field.value}
                onChangeText={field.onChange}
                placeholder={
                  selectedBarangay
                    ? "Enter your purok / sitio"
                    : "Select a barangay first"
                }
                editable={!!selectedBarangay}
                error={fieldState.error?.message}
              />
            )}
          />
        )}
        {form.formState.errors.purok?.message && hasPuroks ? (
          <Text className="text-[12px] text-rose-500">
            {form.formState.errors.purok.message}
          </Text>
        ) : null}
        {!selectedBarangay ? (
          <Text className="text-[11px] text-slate-400">
            Select a barangay to see available puroks.
          </Text>
        ) : null}
      </View>

      <Controller
        control={form.control}
        name="address"
        render={({ field, fieldState }) => (
          <TextField
            ref={addressRef}
            label="Home address (optional)"
            value={field.value ?? ""}
            onChangeText={field.onChange}
            placeholder="House no., street"
            returnKeyType="done"
            onSubmitEditing={() => void goNext()}
            error={fieldState.error?.message}
          />
        )}
      />

      <AppButton label="Next" onPress={() => void goNext()} />
    </View>
  );
}
