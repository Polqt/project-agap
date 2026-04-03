import { Ionicons } from "@expo/vector-icons";
import { Controller } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AppButton, TextField } from "@/shared/components/ui";

import { BANAGO_PUROKS } from "../constants";
import type { SignUpFormActions, SignUpFormState, SignUpRefs } from "../types";
import { SignUpStepHeader } from "./SignUpShared";

type Props = Pick<
  SignUpFormState,
  "form" | "selectedBarangay" | "showBarangayPicker" | "selectedBarangayId"
> &
  Pick<SignUpFormActions, "goNext" | "setShowBarangayPicker" | "setBarangaySearch"> &
  Pick<SignUpRefs, "addressRef" | "bottomSheetRef">;

export function SignUpStepLocation({
  form,
  selectedBarangay,
  goNext,
  setShowBarangayPicker,
  setBarangaySearch,
  addressRef,
  bottomSheetRef,
}: Props) {
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
          <Text className="text-[12px] text-rose-500">{form.formState.errors.barangayId.message}</Text>
        ) : (
          <Text className="text-[11px] text-slate-400">Only barangays enrolled in Agap are shown.</Text>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-[13px] font-medium text-slate-600">Purok / Sitio</Text>
        <View className="flex-row flex-wrap gap-2">
          {BANAGO_PUROKS.map((purok) => {
            const isActive = form.watch("purok") === purok;
            return (
              <Pressable
                key={purok}
                onPress={() => form.setValue("purok", purok, { shouldValidate: true })}
                className={`rounded-lg px-3.5 py-2.5 ${isActive ? "bg-slate-900" : "bg-slate-100"}`}
                style={{ minHeight: 36 }}
              >
                <Text className={`text-[13px] font-semibold ${isActive ? "text-white" : "text-slate-600"}`}>
                  {purok}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {form.formState.errors.purok?.message ? (
          <Text className="text-[12px] text-rose-500">{form.formState.errors.purok.message}</Text>
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
