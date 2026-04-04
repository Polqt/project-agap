import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import type { HouseholdFormValues } from "@/types/forms";
import type { VulnerabilityFlag } from "@project-agap/api/supabase/types";

import { vulnerabilityFlagMeta } from "../constants";

type Props = {
  form: UseFormReturn<HouseholdFormValues>;
};

const emptyMember = {
  fullName: "",
  age: "",
  vulnerabilityFlags: [] as VulnerabilityFlag[],
  notes: "",
} satisfies HouseholdFormValues["members"][number];

const FLAG_ICONS: Record<VulnerabilityFlag, string> = {
  elderly: "👴",
  pwd: "♿",
  infant: "🍼",
  pregnant: "🤰",
  solo_parent: "👤",
  chronic_illness: "💊",
};

export function HouseholdMembersEditor({ form }: Props) {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "members",
  });

  const sheetRef = useRef<BottomSheet>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Local draft state while sheet is open
  const [draft, setDraft] = useState<HouseholdFormValues["members"][number]>(emptyMember);

  const openSheet = useCallback((index: number | null) => {
    if (index === null) {
      setDraft({ ...emptyMember });
      setEditingIndex(null);
    } else {
      const existing = form.getValues(`members.${index}`);
      setDraft({ ...existing });
      setEditingIndex(index);
    }
    sheetRef.current?.expand();
  }, [form]);

  const closeSheet = useCallback(() => {
    sheetRef.current?.close();
    setEditingIndex(null);
  }, []);

  const saveDraft = useCallback(() => {
    if (!draft.fullName.trim()) return;
    if (editingIndex !== null) {
      update(editingIndex, draft);
    } else {
      append(draft);
    }
    closeSheet();
  }, [draft, editingIndex, append, update, closeSheet]);

  const toggleFlag = useCallback((flag: VulnerabilityFlag) => {
    setDraft((prev) => ({
      ...prev,
      vulnerabilityFlags: prev.vulnerabilityFlags.includes(flag)
        ? prev.vulnerabilityFlags.filter((f) => f !== flag)
        : [...prev.vulnerabilityFlags, flag],
    }));
  }, []);

  return (
    <>
      {/* ── Section header ── */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[15px] font-semibold text-slate-900">Members</Text>
          <Text className="text-[12px] text-slate-400">
            {fields.length === 0 ? "No members added yet" : `${fields.length} member${fields.length !== 1 ? "s" : ""} added`}
          </Text>
        </View>
        <Pressable
          onPress={() => openSheet(null)}
          disabled={fields.length >= 19}
          className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${
            fields.length >= 19 ? "bg-slate-100" : "bg-slate-900"
          }`}
        >
          <Ionicons name="add" size={14} color={fields.length >= 19 ? "#94a3b8" : "#fff"} />
          <Text className={`text-[13px] font-semibold ${fields.length >= 19 ? "text-slate-400" : "text-white"}`}>
            Add
          </Text>
        </Pressable>
      </View>

      {/* ── Member chips ── */}
      {fields.length > 0 ? (
        <View className="mt-3 gap-2">
          {fields.map((field, index) => {
            const member = form.watch(`members.${index}`);
            return (
              <Pressable
                key={field.id}
                onPress={() => openSheet(index)}
                className="flex-row items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5"
              >
                {/* Avatar */}
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Text className="text-[15px] font-bold text-slate-600">
                    {member.fullName?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-slate-900" numberOfLines={1}>
                    {member.fullName || "Unnamed member"}
                  </Text>
                  <View className="mt-0.5 flex-row flex-wrap gap-1">
                    {member.age ? (
                      <Text className="text-[12px] text-slate-400">{member.age} yrs</Text>
                    ) : null}
                    {member.vulnerabilityFlags?.length > 0 ? (
                      <Text className="text-[12px] text-slate-400">
                        · {member.vulnerabilityFlags.map((f) => FLAG_ICONS[f]).join(" ")}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* ── Bottom Sheet ── */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["75%", "92%"]}
        enablePanDownToClose
        onClose={() => setEditingIndex(null)}
        backgroundStyle={{ backgroundColor: "#fff" }}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Sheet header */}
          <View className="mb-6 flex-row items-center justify-between pt-2">
            <Text className="text-[18px] font-bold text-slate-900">
              {editingIndex !== null ? "Edit Member" : "Add Member"}
            </Text>
            <View className="flex-row gap-2">
              {editingIndex !== null ? (
                <Pressable
                  onPress={() => {
                    remove(editingIndex);
                    closeSheet();
                  }}
                  className="flex-row items-center gap-1 rounded-full bg-rose-50 px-3.5 py-2"
                >
                  <Ionicons name="trash-outline" size={14} color="#e11d48" />
                  <Text className="text-[13px] font-semibold text-rose-600">Remove</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={closeSheet} className="rounded-full bg-slate-100 p-2">
                <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>
          </View>

          {/* Full Name */}
          <View className="mb-5">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              Full Name *
            </Text>
            <BottomSheetTextInput
              value={draft.fullName}
              onChangeText={(v) => setDraft((d) => ({ ...d, fullName: v }))}
              placeholder="Family member name"
              placeholderTextColor="#94a3b8"
              style={{
                borderWidth: 0,
                borderBottomWidth: 1.5,
                borderBottomColor: "#e2e8f0",
                paddingVertical: 10,
                fontSize: 16,
                color: "#0f172a",
              }}
            />
          </View>

          {/* Age */}
          <View className="mb-6">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              Age (optional)
            </Text>
            <BottomSheetTextInput
              value={draft.age}
              onChangeText={(v) => setDraft((d) => ({ ...d, age: v }))}
              placeholder="e.g. 24"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              style={{
                borderWidth: 0,
                borderBottomWidth: 1.5,
                borderBottomColor: "#e2e8f0",
                paddingVertical: 10,
                fontSize: 16,
                color: "#0f172a",
              }}
            />
          </View>

          {/* Vulnerability flags */}
          <View className="mb-6">
            <Text className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              Priority Tags
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(Object.entries(vulnerabilityFlagMeta) as [VulnerabilityFlag, { label: string; description: string }][]).map(
                ([flag, meta]) => {
                  const selected = draft.vulnerabilityFlags.includes(flag);
                  return (
                    <Pressable
                      key={flag}
                      onPress={() => toggleFlag(flag)}
                      className={`flex-row items-center gap-2 rounded-full border px-3.5 py-2 ${
                        selected
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <Text className="text-[14px]">{FLAG_ICONS[flag]}</Text>
                      <Text
                        className={`text-[13px] font-semibold ${
                          selected ? "text-blue-700" : "text-slate-600"
                        }`}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          {/* Notes */}
          <View className="mb-8">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              Notes (optional)
            </Text>
            <BottomSheetTextInput
              value={draft.notes ?? ""}
              onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
              placeholder="Any detail that helps responders"
              placeholderTextColor="#94a3b8"
              multiline
              style={{
                borderWidth: 0,
                borderBottomWidth: 1.5,
                borderBottomColor: "#e2e8f0",
                paddingVertical: 10,
                fontSize: 15,
                color: "#0f172a",
                minHeight: 60,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* Save */}
          <Pressable
            onPress={saveDraft}
            disabled={!draft.fullName.trim()}
            className={`items-center rounded-2xl py-4 ${
              draft.fullName.trim() ? "bg-slate-900" : "bg-slate-200"
            }`}
          >
            <Text
              className={`text-[15px] font-bold ${
                draft.fullName.trim() ? "text-white" : "text-slate-400"
              }`}
            >
              {editingIndex !== null ? "Save Changes" : "Add Member"}
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
}
