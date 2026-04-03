import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import type { UseFormReturn } from "react-hook-form";
import type { ResidentSignUpFormValues } from "@/types/forms";

type Props = {
  visible: boolean;
  bottomSheetRef: RefObject<BottomSheet | null>;
  puroks: readonly string[];
  selectedPurok: string;
  form: UseFormReturn<ResidentSignUpFormValues>;
  onClose: () => void;
};

export function PurokPicker({
  visible,
  bottomSheetRef,
  puroks,
  selectedPurok,
  form,
  onClose,
}: Props) {
  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={["45%", "70%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 36 }}
    >
      <View style={{ paddingHorizontal: 20 }}>
        <Text className="mb-3 text-[16px] font-bold text-slate-900">
          Select purok / sitio
        </Text>
      </View>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {puroks.length === 0 ? (
          <Text className="py-4 text-center text-[13px] text-slate-400">
            No puroks available for this barangay.
          </Text>
        ) : (
          puroks.map((purok) => {
            const isSelected = selectedPurok === purok;
            return (
              <Pressable
                key={purok}
                onPress={() => {
                  form.setValue("purok", purok, { shouldValidate: true });
                  onClose();
                  bottomSheetRef.current?.close();
                }}
                className={`flex-row items-center justify-between rounded-xl px-3.5 py-3 ${
                  isSelected ? "bg-slate-100" : ""
                }`}
              >
                <Text className="text-[14px] font-medium text-slate-900">
                  {purok}
                </Text>
                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#2563eb"
                  />
                ) : null}
              </Pressable>
            );
          })
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
