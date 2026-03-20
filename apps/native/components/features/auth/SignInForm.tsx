import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Button } from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from "react-native";
import { useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { SectionCard } from "@/components/app/section-card";
import { TextField } from "@/components/app/text-field";
import { useAuth } from "@/providers/AuthProvider";
import { haptics } from "@/services/haptics";
import { supabase } from "@/services/supabase";
import { getErrorMessage } from "@/utils/format";
import { signInSchema } from "@/utils/validation";

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setValue,
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  register("email");
  register("password");

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await haptics.medium();
      await signIn(values.email, values.password);
      await haptics.success();
      router.replace("/(official)/dashboard");
    } catch (error) {
      await haptics.error();
      setErrorMessage(getErrorMessage(error, "Hindi makapasok. Subukan muli."));
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleResetPassword = async () => {
    const email = getValues("email");

    if (!email) {
      setResetMessage("Ilagay muna ang email address mo.");
      return;
    }

    try {
      await haptics.light();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "project-agap://reset-password",
      });
      setResetMessage("Nagpadala kami ng reset link sa email mo.");
    } catch (error) {
      setResetMessage(getErrorMessage(error, "Hindi maipadala ang reset link ngayon."));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-6">
          <View className="gap-3 pt-6">
            <Link href="/onboarding" className="text-sm font-medium text-blue-700">
              Bumalik
            </Link>
            <Text className="text-4xl font-semibold text-slate-950">Official Sign In</Text>
            <Text className="text-base leading-7 text-slate-600">
              Secure access for barangay responders and coordinators.
            </Text>
          </View>

          <View className="mt-8 gap-4">
            <SectionCard
              title="Account"
              description="Use the official email account assigned to your barangay."
            >
              <View className="gap-4">
                <TextField
                  autoCapitalize="none"
                  keyboardType="email-address"
                  label="Email"
                  error={errors.email?.message}
                  onChangeText={(value) => setValue("email", value, { shouldValidate: true })}
                  placeholder="captain@barangay.gov.ph"
                  value={getValues("email")}
                />
                <TextField
                  label="Password"
                  error={errors.password?.message}
                  onChangeText={(value) => setValue("password", value, { shouldValidate: true })}
                  placeholder="Ilagay ang password"
                  secureTextEntry
                  value={getValues("password")}
                />
              </View>
            </SectionCard>

            {errorMessage ? (
              <Text className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </Text>
            ) : null}

            {resetMessage ? (
              <Text className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
                {resetMessage}
              </Text>
            ) : null}

            <Button className="rounded-2xl bg-[#0F3A8A]" isDisabled={isSubmitting} onPress={onSubmit}>
              <Button.Label className="font-semibold text-white">
                {isSubmitting ? "Nag-sign in..." : "Mag-sign in"}
              </Button.Label>
            </Button>

            <TouchableOpacity onPress={() => void handleResetPassword()}>
              <Text className="text-center text-sm font-medium text-blue-700">
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
