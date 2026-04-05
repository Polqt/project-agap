import { Ionicons } from "@expo/vector-icons";
import { Switch, Text, View } from "react-native";

import { AppButton } from "@/shared/components/ui";

import type { SignUpFormActions, SignUpFormState } from "../types";
import { SignUpMemberCounter, SignUpStepHeader, SignUpVulnerabilityChips } from "./SignUpShared";

type Props = Pick<SignUpFormState, "form" | "totalMembers" | "vulnFlags" | "isSmsOnly"> &
  Pick<SignUpFormActions, "goNext" | "toggleVulnerabilityFlag">;

export function SignUpStepHousehold({
  form,
  totalMembers,
  vulnFlags,
  isSmsOnly,
  goNext,
  toggleVulnerabilityFlag,
}: Props) {
  return (
    <View className="gap-5">
      <SignUpStepHeader step={2} title="Household info" />

      <SignUpMemberCounter value={totalMembers} onChange={(n) => form.setValue("totalMembers", n)} />

      <SignUpVulnerabilityChips selected={vulnFlags} onToggle={toggleVulnerabilityFlag} />

      <View className="gap-2">
        <Text className="text-[13px] font-medium text-slate-600">No smartphone in household?</Text>
        <View className="flex-row items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
          <Text className="text-[14px] text-slate-700">Mark as SMS-only household</Text>
          <Switch
            value={isSmsOnly}
            onValueChange={(v) => form.setValue("isSmsOnly", v)}
            trackColor={{ false: "#e2e8f0", true: "#3b82f6" }}
            thumbColor="#ffffff"
          />
        </View>
        {isSmsOnly ? (
          <View className="flex-row items-start gap-2 rounded-xl bg-blue-50 px-3.5 py-2.5">
            <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
            <Text className="flex-1 text-[12px] leading-4 text-blue-600">
              Officials will contact this household via SMS only. Push notifications will be disabled.
            </Text>
          </View>
        ) : null}
      </View>

      <AppButton label="Next" onPress={() => void goNext()} />
    </View>
  );
}
