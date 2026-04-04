import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { type AppLanguage, LANGUAGE_OPTIONS } from "@/shared/i18n";
import { useAppLanguage } from "@/shared/hooks/useAppLanguage";

const LANG_FLAG: Record<AppLanguage, string> = {
  en: "🇺🇸",
  fil: "🇵🇭",
  hil: "🇵🇭",
  ceb: "🇵🇭",
  krj: "🇵🇭",
};

export function LanguagePill() {
  const { currentLanguage, currentOption, changeLanguage } = useAppLanguage();
  const sheetRef = useRef<BottomSheet>(null);

  return (
    <>
      {/* Pill button */}
      <Pressable
        onPress={() => sheetRef.current?.snapToIndex(0)}
        className="flex-row items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-sm border border-slate-100"
      >
        <Text className="text-[13px]">{LANG_FLAG[currentLanguage]}</Text>
        <Text className="text-[12px] font-semibold text-slate-700">
          {currentOption.code.toUpperCase()}
        </Text>
        <Ionicons name="chevron-down" size={11} color="#94a3b8" />
      </Pressable>

      {/* Language picker sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["45%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 36 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text className="mb-4 text-[16px] font-bold text-slate-900">Language</Text>
          <View className="gap-2">
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = currentLanguage === option.code;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => {
                    void changeLanguage(option.code as AppLanguage);
                    sheetRef.current?.close();
                  }}
                  className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
                    isSelected ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[20px]">{LANG_FLAG[option.code as AppLanguage]}</Text>
                    <View>
                      <Text className={`text-[14px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                        {option.nativeLabel}
                      </Text>
                      {option.nativeLabel !== option.label ? (
                        <Text className="text-[12px] text-slate-400">{option.label}</Text>
                      ) : null}
                    </View>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                  ) : (
                    <View className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
}
