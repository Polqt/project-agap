import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { vulnerabilityFlagOptions } from "@/types/forms";

import { TOTAL_SIGN_UP_STEPS, VULNERABILITY_LABELS } from "../constants";

export function SignUpProgressBar({ step }: { step: number }) {
  const progress = ((step + 1) / TOTAL_SIGN_UP_STEPS) * 100;

  return (
    <View className="h-1 overflow-hidden rounded-full bg-slate-200">
      <View className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
    </View>
  );
}

export function SignUpStepHeader({ step, title }: { step: number; title: string }) {
  return (
    <View className="mb-5">
      <Text className="text-[12px] font-semibold text-slate-400">
        Step {step + 1} of {TOTAL_SIGN_UP_STEPS}
      </Text>
      <Text className="mt-1 text-[22px] font-bold text-slate-900">{title}</Text>
    </View>
  );
}

export function SignUpMemberCounter({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium text-slate-600">Total household members</Text>
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={() => onChange(Math.max(1, value - 1))}
          className="h-11 w-11 items-center justify-center rounded-xl bg-slate-100"
        >
          <Ionicons name="remove" size={20} color="#334155" />
        </Pressable>
        <Text className="min-w-8 text-center text-[20px] font-bold text-slate-900">{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(30, value + 1))}
          className="h-11 w-11 items-center justify-center rounded-xl bg-slate-100"
        >
          <Ionicons name="add" size={20} color="#334155" />
        </Pressable>
      </View>
    </View>
  );
}

export function SignUpVulnerabilityChips({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (flag: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium text-slate-600">
        Vulnerability flags <Text className="font-normal text-slate-400">(select all that apply)</Text>
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {vulnerabilityFlagOptions.map((flag) => {
          const isActive = selected.includes(flag);
          return (
            <Pressable
              key={flag}
              onPress={() => onToggle(flag)}
              className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                isActive ? "bg-rose-100" : "bg-slate-100"
              }`}
              style={{ minHeight: 36 }}
            >
              <View
                className={`h-2.5 w-2.5 rounded-full border ${
                  isActive ? "border-rose-500 bg-rose-500" : "border-slate-300 bg-white"
                }`}
              />
              <Text
                className={`text-[13px] font-medium ${isActive ? "text-rose-700" : "text-slate-600"}`}
              >
                {VULNERABILITY_LABELS[flag] ?? flag}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-[11px] text-slate-400">
        Helps officials prioritize welfare checks during active events.
      </Text>
    </View>
  );
}

export function SignUpPermissionRow({
  icon,
  iconColor,
  title,
  description,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <View className="flex-row gap-3.5">
      <View
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-slate-900">{title}</Text>
        <Text className="mt-0.5 text-[13px] leading-4.5 text-slate-500">{description}</Text>
        {hint ? (
          <View className="mt-2 self-start rounded-lg bg-blue-50 px-2.5 py-1">
            <Text className="text-[12px] font-medium text-blue-600">{hint}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
