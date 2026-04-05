import { Ionicons } from "@expo/vector-icons";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

type ReportInput = {
  fullName: string;
  age?: number;
  lastSeenLocation?: string;
  description?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  reportMutation: UseMutationResult<unknown, unknown, ReportInput, unknown>;
};

export function ReportMissingModal({ visible, onClose, reportMutation }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ fullName: "", age: "", lastSeenLocation: "", description: "" });

  // Close and reset when mutation succeeds
  useEffect(() => {
    if (reportMutation.isSuccess) handleClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportMutation.isSuccess]);

  function handleClose() {
    setForm({ fullName: "", age: "", lastSeenLocation: "", description: "" });
    onClose();
  }

  function handleSubmit() {
    if (!form.fullName.trim()) {
      Alert.alert(t("common.error"), t("alerts.nameRequired"));
      return;
    }
    reportMutation.mutate({
      fullName: form.fullName.trim(),
      age: form.age ? parseInt(form.age, 10) : undefined,
      lastSeenLocation: form.lastSeenLocation.trim() || undefined,
      description: form.description.trim() || undefined,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
          <Text className="text-[17px] font-bold text-slate-900">{t("alerts.reportMissingTitle")}</Text>
          <Pressable onPress={handleClose}>
            <Ionicons name="close" size={22} color="#64748b" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="gap-4 py-4">
            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">{t("alerts.fullName")}</Text>
              <TextInput
                value={form.fullName}
                onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
                placeholder={t("alerts.namePlaceholder")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">{t("alerts.age")}</Text>
              <TextInput
                value={form.age}
                onChangeText={(v) => setForm((f) => ({ ...f, age: v }))}
                placeholder={t("alerts.agePlaceholder")}
                keyboardType="numeric"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">{t("alerts.lastSeenLocation")}</Text>
              <TextInput
                value={form.lastSeenLocation}
                onChangeText={(v) => setForm((f) => ({ ...f, lastSeenLocation: v }))}
                placeholder={t("alerts.locationPlaceholder")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">{t("alerts.description")}</Text>
              <TextInput
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder={t("alerts.descriptionPlaceholder")}
                multiline
                numberOfLines={3}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                placeholderTextColor="#94a3b8"
                style={{ textAlignVertical: "top", minHeight: 80 }}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={reportMutation.isPending}
              className={`items-center rounded-2xl py-4 ${reportMutation.isPending ? "bg-slate-200" : "bg-rose-600"}`}
            >
              <Text className={`text-[15px] font-bold ${reportMutation.isPending ? "text-slate-400" : "text-white"}`}>
                {reportMutation.isPending ? t("alerts.submitting") : t("alerts.submitReport")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
