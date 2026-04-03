import { Pressable, Text, View } from "react-native";

import { AppButton } from "@/shared/components/ui";

import type { SignUpFormActions, SignUpFormState } from "../types";
import { SignUpPermissionRow, SignUpStepHeader } from "./SignUpShared";

type Props = Pick<SignUpFormState, "submitError" | "isSubmitting" | "isOnline"> &
  Pick<SignUpFormActions, "handlePermissionsAndSubmit" | "handleSkipPermissions">;

export function SignUpStepPermissions({
  submitError,
  isSubmitting,
  isOnline,
  handlePermissionsAndSubmit,
  handleSkipPermissions,
}: Props) {
  return (
    <View className="gap-5">
      <SignUpStepHeader step={3} title="Permissions" />

      <SignUpPermissionRow
        icon="notifications-outline"
        iconColor="#2563eb"
        title="Push notifications"
        description="Receive emergency alerts and evacuation orders from your barangay officials."
        hint="Required for real-time alerts during typhoons."
      />

      <SignUpPermissionRow
        icon="location-outline"
        iconColor="#059669"
        title="Location access"
        description="Find the nearest evacuation center and attach coordinates to your safety ping."
      />

      <Text className="text-[12px] leading-4 text-slate-400 italic">
        Only used during active alerts. Never shared without your consent.
      </Text>

      {submitError ? (
        <View className="rounded-xl bg-rose-50 px-3.5 py-3">
          <Text className="text-[13px] text-rose-600">{submitError}</Text>
        </View>
      ) : null}

      <AppButton
        label="Allow and finish setup"
        onPress={() => void handlePermissionsAndSubmit()}
        loading={isSubmitting}
        disabled={!isOnline}
      />

      <Pressable onPress={handleSkipPermissions} disabled={!isOnline || isSubmitting}>
        <Text className="text-center text-[14px] font-medium text-blue-600">Skip for now</Text>
      </Pressable>
    </View>
  );
}
