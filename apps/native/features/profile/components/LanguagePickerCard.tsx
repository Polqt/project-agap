import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/shared/components/ui";
import { type AppLanguage, LANGUAGE_OPTIONS } from "@/shared/i18n";
import { useAppLanguage } from "@/shared/hooks/useAppLanguage";

export function LanguagePickerCard() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useAppLanguage();

  return (
    <SectionCard
      title={t("profile.language")}
      subtitle={t("profile.changeLanguage")}
    >
      <View className="gap-2">
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = currentLanguage === option.code;
          return (
            <Pressable
              key={option.code}
              onPress={() => void changeLanguage(option.code as AppLanguage)}
              className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <View>
                <Text
                  className={`text-[14px] font-semibold ${
                    isSelected ? "text-blue-700" : "text-slate-800"
                  }`}
                >
                  {option.nativeLabel}
                </Text>
                {option.nativeLabel !== option.label ? (
                  <Text className="text-[12px] text-slate-400">{option.label}</Text>
                ) : null}
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
    </SectionCard>
  );
}
