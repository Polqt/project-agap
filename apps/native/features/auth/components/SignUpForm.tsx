import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, type TextInput, View } from "react-native";

import { AuthFormScroll } from "@/shared/components/auth-form-scroll";
import { AppButton, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage } from "@/shared/utils/errors";
import { residentSignUpSchema, type ResidentSignUpFormValues } from "@/types/forms";

const personalFields = ["email", "password", "confirmPassword", "fullName"] as const;
const PILOT_BARANGAY_BANAGO_ID = "c0ffee00-baaa-4aaa-8aaa-0000bac0d001";
const PILOT_BARANGAY_LABEL = "Barangay Banago, Bacolod City";

export function SignUpForm() {
  const router = useRouter();
  const { signUpResident, role, isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fullNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const purokRef = useRef<TextInput>(null);

  const form = useForm<ResidentSignUpFormValues>({
    resolver: zodResolver(residentSignUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phoneNumber: "",
      barangayId: PILOT_BARANGAY_BANAGO_ID,
      purok: "",
    },
  });

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role) {
      return;
    }

    router.replace(role === "official" ? "/(official)/dashboard" : "/(resident)/status");
  }, [isAuthenticated, isLoading, role, router]);

  useEffect(() => {
    form.setValue("barangayId", PILOT_BARANGAY_BANAGO_ID, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [form]);

  const nextStep = async () => {
    if (step === 0) {
      const isValid = await form.trigger(personalFields);
      if (isValid) {
        setStep(1);
      }
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await signUpResident({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phoneNumber: values.phoneNumber || null,
        barangayId: values.barangayId,
        purok: values.purok,
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Unable to create your account."));
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <AuthFormScroll>
      <ScreenHeader
        eyebrow="Resident sign-up"
        title="Create your resident account"
        description="This is a short two-step flow for Banago residents: personal info, then purok assignment."
      />

      <SectionCard
        title={`Step ${step + 1} of 2`}
        subtitle={
          step === 0
            ? "Start with your personal details and login credentials."
            : "Finish your setup with your purok."
        }
        right={<Pill label={step === 0 ? "Personal" : "Purok"} tone="info" />}
      >
        {step === 0 ? (
          <View className="gap-4">
            <Controller
              control={form.control}
              name="fullName"
              render={({ field, fieldState }) => (
                <TextField
                  ref={fullNameRef}
                  label="Full name"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="Juan Dela Cruz"
                  textContentType="name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="phoneNumber"
              render={({ field, fieldState }) => (
                <TextField
                  ref={phoneRef}
                  label="Phone number"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="09xxxxxxxxx"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <TextField
                  ref={emailRef}
                  label="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="you@example.com"
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
                <TextField
                  ref={passwordRef}
                  label="Password"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Create a password"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="password-new"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <TextField
                  ref={confirmPasswordRef}
                  label="Confirm password"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Repeat your password"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={() => void nextStep()}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View className="gap-4">
            <View className="gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
              <Text className="text-sm font-medium text-slate-700">Assigned pilot barangay</Text>
              <Text className="text-base font-semibold text-slate-950">{PILOT_BARANGAY_LABEL}</Text>
              <Text className="text-sm text-slate-600">
                Agap v1 currently supports resident registration for Banago only, so your account will be assigned here automatically.
              </Text>
            </View>
            {form.formState.errors.barangayId?.message ? (
              <Text className="text-sm text-rose-600">{form.formState.errors.barangayId.message}</Text>
            ) : null}
            <Controller
              control={form.control}
              name="purok"
              render={({ field, fieldState }) => (
                <TextField
                  ref={purokRef}
                  label="Purok"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="Purok 3"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit()}
                  error={fieldState.error?.message}
                  helperText="You can edit this later from your profile."
                />
              )}
            />
            {submitError ? <Text className="text-sm text-rose-600">{submitError}</Text> : null}
          </View>
        ) : null}

        <View className="mt-6 flex-row gap-3">
          {step > 0 ? <AppButton label="Back" onPress={() => setStep((value) => value - 1)} variant="ghost" /> : null}
          {step < 1 ? <AppButton label="Continue" onPress={() => void nextStep()} /> : null}
          {step === 1 ? <AppButton label="Create account" onPress={handleSubmit} loading={isSubmitting} /> : null}
        </View>
      </SectionCard>

      <SectionCard title="Already registered?" subtitle="Returning residents can sign in with their email and password.">
        <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
          <Text className="text-sm font-medium text-blue-700">Go to sign in</Text>
        </Pressable>
      </SectionCard>
    </AuthFormScroll>
  );
}
