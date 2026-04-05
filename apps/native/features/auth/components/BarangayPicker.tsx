import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { SignUpFormActions, SignUpFormState, SignUpRefs } from "../types";

type Props = Pick<
  SignUpFormState,
  "barangaySearch" | "filteredBarangays" | "selectedBarangayId" | "form" | "showBarangayPicker"
> &
  Pick<SignUpFormActions, "setBarangaySearch" | "setShowBarangayPicker"> &
  Pick<SignUpRefs, "bottomSheetRef"> & {
    isLoading: boolean;
  };

export function BarangayPicker({
  showBarangayPicker,
  bottomSheetRef,
  barangaySearch,
  setBarangaySearch,
  filteredBarangays,
  selectedBarangayId,
  form,
  setShowBarangayPicker,
  isLoading,
}: Props) {
  if (!showBarangayPicker) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={["60%", "85%"]}
      enablePanDownToClose
      onClose={() => setShowBarangayPicker(false)}
      backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 36 }}
    >
      <View style={{ paddingHorizontal: 20 }}>
        <Text className="mb-3 text-[16px] font-bold text-slate-900">Select barangay</Text>
        <BottomSheetTextInput
          value={barangaySearch}
          onChangeText={setBarangaySearch}
          placeholder="Search barangay..."
          className="mb-3 min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[15px] text-slate-900"
          placeholderTextColor="#94a3b8"
        />
      </View>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {isLoading ? (
          <Text className="py-4 text-center text-[13px] text-slate-400">Loading barangays...</Text>
        ) : filteredBarangays.length === 0 ? (
          <Text className="py-4 text-center text-[13px] text-slate-400">No barangays found.</Text>
        ) : (
          filteredBarangays.map((barangay) => {
            const isSelected = selectedBarangayId === barangay.id;
            return (
              <Pressable
                key={barangay.id}
                onPress={() => {
                  const prevId = form.getValues("barangayId");
                  form.setValue("barangayId", barangay.id, { shouldValidate: true });
                  if (prevId !== barangay.id) {
                    form.setValue("purok", "", { shouldValidate: false });
                  }
                  setShowBarangayPicker(false);
                  bottomSheetRef.current?.close();
                }}
                className={`flex-row items-center justify-between rounded-xl px-3.5 py-3 ${
                  isSelected ? "bg-slate-100" : ""
                }`}
              >
                <View>
                  <Text className="text-[14px] font-medium text-slate-900">{barangay.name}</Text>
                  <Text className="text-[12px] text-slate-400">
                    {barangay.municipality}, {barangay.province}
                  </Text>
                </View>
                {isSelected ? <Ionicons name="checkmark-circle" size={20} color="#2563eb" /> : null}
              </Pressable>
            );
          })
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
