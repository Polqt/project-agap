import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptics } from "@/services/haptics";
import { getPostAuthRoute } from "@/services/onboarding";
import { AuthFormScroll } from "@/shared/components/auth-form-scroll";
import { useAuth } from "@/shared/hooks/useAuth";

import { useSignUpForm } from "../hooks/useSignUpForm";
import { requestSignUpPermissionsAsync } from "../services/permissions";
import { BarangayPicker } from "./BarangayPicker";
import { PurokPicker } from "./PurokPicker";
import { SignUpProgressBar } from "./SignUpShared";
import { SignUpStepDetails } from "./SignUpStepDetails";
import { SignUpStepHousehold } from "./SignUpStepHousehold";
import { SignUpStepLocation } from "./SignUpStepLocation";
import { SignUpStepPermissions } from "./SignUpStepPermissions";

export function SignUpForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role, isAuthenticated, isLoading: authLoading, session } = useAuth();
  const signUp = useSignUpForm();

  useEffect(() => {
    if (authLoading || !isAuthenticated || !role || !session?.user.id) {
      return;
    }

    let isCancelled = false;
    const userId = session.user.id;
    const resolvedRole = role;

    async function routeAfterSignUp() {
      const nextRoute = await getPostAuthRoute(userId, resolvedRole);

      if (!isCancelled) {
        router.replace(nextRoute);
      }
    }

    void routeAfterSignUp();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, isAuthenticated, role, router, session?.user.id]);

  const goBack = useCallback(() => {
    if (signUp.step > 0) {
      signUp.goBack();
      return;
    }

    if (signUp.form.formState.isDirty) {
      Alert.alert("Discard changes?", "You have unsaved progress. Going back will discard it.", [
        { text: "Stay", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]);
      return;
    }

    router.back();
  }, [router, signUp]);

  const handlePermissionsAndSubmit = useCallback(async () => {
    await requestSignUpPermissionsAsync();
    await signUp.handleFinalSubmit();
  }, [signUp]);

  return (
    <>
      <AuthFormScroll>
        <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center justify-between">
            <Pressable onPress={goBack} className="flex-row items-center gap-1 py-2">
              <Ionicons name="chevron-back" size={20} color="#334155" />
              <Text className="text-[15px] font-medium text-slate-700">Back</Text>
            </Pressable>
            <View className="rounded-lg bg-blue-50 px-2.5 py-1">
              <Text className="text-[11px] font-semibold text-blue-600">Resident</Text>
            </View>
          </View>
          <View className="mt-3">
            <SignUpProgressBar step={signUp.step} />
          </View>
        </View>

        <View className="px-6 pt-5">
          {!signUp.isOnline ? (
            <View className="mb-4 flex-row items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-3">
              <Ionicons name="cloud-offline-outline" size={16} color="#d97706" />
              <Text className="flex-1 text-[13px] font-medium text-amber-700">
                You're offline — please connect to complete registration.
              </Text>
            </View>
          ) : null}

          {signUp.step === 0 ? (
            <SignUpStepDetails
              form={signUp.form}
              goNext={signUp.goNext}
              fullNameRef={signUp.fullNameRef}
              phoneRef={signUp.phoneRef}
              emailRef={signUp.emailRef}
              passwordRef={signUp.passwordRef}
              confirmPasswordRef={signUp.confirmPasswordRef}
            />
          ) : null}

          {signUp.step === 1 ? (
            <SignUpStepLocation
              form={signUp.form}
              selectedBarangay={signUp.selectedBarangay}
              selectedBarangayId={signUp.selectedBarangayId}
              selectedPurok={signUp.selectedPurok}
              availablePuroks={signUp.availablePuroks}
              goNext={signUp.goNext}
              setShowBarangayPicker={signUp.setShowBarangayPicker}
              setBarangaySearch={signUp.setBarangaySearch}
              setShowPurokPicker={signUp.setShowPurokPicker}
              addressRef={signUp.addressRef}
              bottomSheetRef={signUp.bottomSheetRef}
              purokBottomSheetRef={signUp.purokBottomSheetRef}
              showBarangayPicker={signUp.showBarangayPicker}
            />
          ) : null}

          {signUp.step === 2 ? (
            <SignUpStepHousehold
              form={signUp.form}
              totalMembers={signUp.totalMembers}
              vulnFlags={signUp.vulnFlags}
              isSmsOnly={signUp.isSmsOnly}
              goNext={signUp.goNext}
              toggleVulnerabilityFlag={signUp.toggleVulnerabilityFlag}
            />
          ) : null}

          {signUp.step === 3 ? (
            <SignUpStepPermissions
              submitError={signUp.submitError}
              isSubmitting={signUp.isSubmitting}
              isOnline={signUp.isOnline}
              handlePermissionsAndSubmit={handlePermissionsAndSubmit}
              handleSkipPermissions={signUp.handleSkipPermissions}
            />
          ) : null}

          <View className="mt-6 pb-8">
            <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
              <Text className="text-center text-[13px] text-slate-400">
                Already have an account? <Text className="font-medium text-blue-600">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </AuthFormScroll>

      <BarangayPicker
        showBarangayPicker={signUp.showBarangayPicker}
        bottomSheetRef={signUp.bottomSheetRef}
        barangaySearch={signUp.barangaySearch}
        setBarangaySearch={signUp.setBarangaySearch}
        filteredBarangays={signUp.filteredBarangays}
        selectedBarangayId={signUp.selectedBarangayId}
        form={signUp.form}
        setShowBarangayPicker={signUp.setShowBarangayPicker}
        isLoading={signUp.barangaysQuery.isLoading}
      />

      <PurokPicker
        visible={signUp.showPurokPicker}
        bottomSheetRef={signUp.purokBottomSheetRef}
        puroks={signUp.availablePuroks}
        selectedPurok={signUp.selectedPurok}
        form={signUp.form}
        onClose={() => signUp.setShowPurokPicker(false)}
      />
    </>
  );
}
