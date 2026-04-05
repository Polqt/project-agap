import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@tanstack/react-store";

import { getPostAuthRoute } from "@/services/onboarding";
import { AuthFormScroll } from "@/shared/components/auth-form-scroll";
import { AppButton, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { signInSchema, type SignInFormValues } from "@/types/forms";
import { appShellStore } from "@/stores/app-shell-store";

export function SignInForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, role, isAuthenticated, isLoading, resetPassword, session } = useAuth();
  const selectedRole = useStore(appShellStore, (state) => state.selectedRole);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const isOfficial = selectedRole === "official";

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role || !session?.user.id) {
      return;
    }

    let isCancelled = false;
    const userId = session.user.id;
    const resolvedRole = role;

    async function routeAfterSignIn() {
      const nextRoute = await getPostAuthRoute(userId, resolvedRole);

      if (!isCancelled) {
        router.replace(nextRoute);
      }
    }

    void routeAfterSignIn();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, isLoading, role, router, session?.user.id]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await signIn(values);
    } catch (error) {
      setSubmitError(
        isOfflineLikeError(error)
          ? "You're offline. Official sign-in needs internet unless this device already has an active saved session."
          : getErrorMessage(error, "Unable to sign in right now."),
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleResetPassword = async () => {
    const email = form.getValues("email");
    if (!email) {
      setSubmitError("Enter your email first so we know where to send the reset link.");
      return;
    }
    setSubmitError(null);
    setIsResetting(true);
    try {
      await resetPassword(email);
      setSubmitError("Password reset link sent. Check your email.");
    } catch (error) {
      setSubmitError(
        isOfflineLikeError(error)
          ? "You're offline. Password reset needs internet access."
          : getErrorMessage(error, "Unable to send a reset link."),
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AuthFormScroll>
      {/* Header with back + role badge */}
      <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 py-2">
            <Ionicons name="chevron-back" size={20} color="#334155" />
          </Pressable>
          {isOfficial ? (
            <View className="rounded-lg bg-teal-50 px-2.5 py-1">
              <Text className="text-[11px] font-semibold text-teal-700">Official</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="px-6 pt-5">
        {/* Title */}
        <Text className="text-[22px] font-bold text-slate-900">
          {isOfficial ? "Official login" : "Sign in"}
        </Text>
        {isOfficial ? (
          <Text className="mt-1 text-[13px] text-slate-400">
            Bgy. Poblacion, Sagay City
          </Text>
        ) : null}

        {/* Official helper text */}
        {isOfficial ? (
          <View className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
            <Text className="text-[13px] leading-4.5 text-slate-500">
              Your account was created by the platform administrator. Contact your BDRRMC coordinator
              if you have not received credentials.
            </Text>
          </View>
        ) : null}

        {/* Form */}
        <View className="mt-5 gap-4">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                ref={emailRef}
                label="Email address"
                value={field.value}
                onChangeText={field.onChange}
                placeholder={isOfficial ? "official@bgy.ph" : "you@example.com"}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <View className="gap-2">
                <Text className="text-[13px] font-medium text-slate-600">Password</Text>
                <View
                  className={`flex-row items-center rounded-xl border ${
                    fieldState.error
                      ? "border-rose-300 bg-rose-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <TextInput
                    ref={passwordRef}
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={() => void handleSubmit()}
                    className="min-h-11 flex-1 px-3.5 text-[15px] text-slate-900"
                    placeholderTextColor="#94a3b8"
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    className="px-3.5"
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#94a3b8"
                    />
                  </Pressable>
                </View>
                {fieldState.error?.message ? (
                  <Text className="text-[12px] text-rose-500">{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />

          {submitError ? (
            <View className="rounded-xl bg-rose-50 px-3.5 py-3">
              <Text className="text-[13px] text-rose-600">{submitError}</Text>
            </View>
          ) : null}

          <AppButton label="Sign in" onPress={handleSubmit} loading={isSubmitting} />

          <Pressable onPress={() => void handleResetPassword()} disabled={isResetting}>
            <Text className="text-center text-[14px] font-medium text-blue-600">
              Forgot password?
            </Text>
          </Pressable>
        </View>

        {/* Footer: switch role */}
        <View className="mt-8 pb-8">
          <Pressable onPress={() => router.replace("/onboarding")}>
            <Text className="text-center text-[13px] text-slate-400">
              Not your role?{" "}
              <Text className="font-medium text-blue-600">Switch role</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthFormScroll>
  );
}
