import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { useStore } from "@tanstack/react-store";

import { AppButton, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage } from "@/shared/utils/errors";
import { signInSchema, type SignInFormValues } from "@/types/forms";
import { appShellStore } from "@/stores/app-shell-store";

export function SignInForm() {
  const router = useRouter();
  const { signIn, role, isAuthenticated, isLoading, resetPassword } = useAuth();
  const selectedRole = useStore(appShellStore, (state) => state.selectedRole);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role) {
      return;
    }

    router.replace(role === "official" ? "/(official)/dashboard" : "/(resident)/status");
  }, [isAuthenticated, isLoading, role, router]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await signIn(values);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Unable to sign in right now."));
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
      setSubmitError(getErrorMessage(error, "Unable to send a reset link."));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow={selectedRole === "official" ? "Official sign-in" : "Sign in"}
        title="Welcome back"
        description="Use your email and password to continue. Officials and returning residents both use this screen."
      />

      <SectionCard title="Account access" subtitle="Officials are pre-created. Residents can sign in here after their first registration.">
        <View className="gap-4">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                label="Password"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Enter your password"
                secureTextEntry
                error={fieldState.error?.message}
              />
            )}
          />

          {submitError ? <Text className="text-sm text-rose-600">{submitError}</Text> : null}

          <AppButton label="Sign in" onPress={handleSubmit} loading={isSubmitting} />
          <AppButton
            label="Send password reset"
            onPress={handleResetPassword}
            variant="ghost"
            loading={isResetting}
          />
        </View>
      </SectionCard>

      <SectionCard title="Need a resident account?" subtitle="New residents create an account through the guided onboarding flow.">
        <Pressable onPress={() => router.replace("/(auth)/sign-up")}>
          <Text className="text-sm font-medium text-blue-700">
            Create a resident account
          </Text>
        </Pressable>
      </SectionCard>
    </View>
  );
}
