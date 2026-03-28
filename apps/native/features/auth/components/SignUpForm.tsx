import { zodResolver } from "@hookform/resolvers/zod";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AppButton, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { getErrorMessage } from "@/shared/utils/errors";
import { trpc } from "@/services/trpc";
import { residentSignUpSchema, type ResidentSignUpFormValues } from "@/types/forms";

const personalFields = ["email", "password", "confirmPassword", "fullName"] as const;

export function SignUpForm() {
  const router = useRouter();
  const { signUpResident, role, isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [barangayQuery, setBarangayQuery] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResidentSignUpFormValues>({
    resolver: zodResolver(residentSignUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phoneNumber: "",
      barangayId: "",
      purok: "",
    },
  });

  const barangaysQuery = useQuery(
    trpc.barangays.listAll.queryOptions(undefined, {
      staleTime: 1000 * 60 * 5,
    }),
  );

  const filteredBarangays = useMemo(() => {
    const query = barangayQuery.trim().toLowerCase();

    if (!query) {
      return barangaysQuery.data ?? [];
    }

    return (barangaysQuery.data ?? []).filter((barangay) => {
      return `${barangay.name} ${barangay.municipality} ${barangay.province}`
        .toLowerCase()
        .includes(query);
    });
  }, [barangayQuery, barangaysQuery.data]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role) {
      return;
    }

    router.replace(role === "official" ? "/(official)/dashboard" : "/(resident)/status");
  }, [isAuthenticated, isLoading, role, router]);

  const nextStep = async () => {
    if (step === 0) {
      const isValid = await form.trigger(personalFields);
      if (isValid) {
        setStep(1);
      }
      return;
    }

    if (step === 1) {
      const isValid = await form.trigger("barangayId");
      if (isValid) {
        setStep(2);
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
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="Resident sign-up"
        title="Create your resident account"
        description="This is a short three-step flow: personal info, barangay selection, then purok assignment."
      />

      <SectionCard
        title={`Step ${step + 1} of 3`}
        subtitle={
          step === 0
            ? "Start with your personal details and login credentials."
            : step === 1
              ? "Pick the barangay where your household belongs."
              : "Finish your setup with your purok."
        }
        right={<Pill label={step === 0 ? "Personal" : step === 1 ? "Barangay" : "Purok"} tone="info" />}
      >
        {step === 0 ? (
          <View className="gap-4">
            <Controller
              control={form.control}
              name="fullName"
              render={({ field, fieldState }) => (
                <TextField
                  label="Full name"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="Juan Dela Cruz"
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="phoneNumber"
              render={({ field, fieldState }) => (
                <TextField
                  label="Phone number"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="09xxxxxxxxx"
                  keyboardType="phone-pad"
                  error={fieldState.error?.message}
                />
              )}
            />
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
                  placeholder="Create a password"
                  secureTextEntry
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <TextField
                  label="Confirm password"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Repeat your password"
                  secureTextEntry
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View className="gap-4">
            <TextField
              label="Search barangay"
              value={barangayQuery}
              onChangeText={setBarangayQuery}
              placeholder="Search by barangay or municipality"
            />
            <Controller
              control={form.control}
              name="barangayId"
              render={({ field, fieldState }) => (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-slate-700">Barangay list</Text>
                  <View className="h-80 rounded-2xl border border-slate-200 bg-slate-50">
                    <FlashList
                      data={filteredBarangays}
                      renderItem={({ item }) => (
                        <Pressable
                          onPress={() => field.onChange(item.id)}
                          className={`border-b border-slate-200 px-4 py-4 ${field.value === item.id ? "bg-blue-50" : ""}`}
                        >
                          <Text className="text-base font-semibold text-slate-950">{item.name}</Text>
                          <Text className="mt-1 text-sm text-slate-500">
                            {item.municipality}, {item.province}
                          </Text>
                        </Pressable>
                      )}
                    />
                  </View>
                  {fieldState.error?.message ? (
                    <Text className="text-sm text-rose-600">{fieldState.error.message}</Text>
                  ) : null}
                </View>
              )}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View className="gap-4">
            <Controller
              control={form.control}
              name="purok"
              render={({ field, fieldState }) => (
                <TextField
                  label="Purok"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="Purok 3"
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
          {step < 2 ? <AppButton label="Continue" onPress={() => void nextStep()} /> : null}
          {step === 2 ? <AppButton label="Create account" onPress={handleSubmit} loading={isSubmitting} /> : null}
        </View>
      </SectionCard>

      <SectionCard title="Already registered?" subtitle="Returning residents can sign in with their email and password.">
        <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
          <Text className="text-sm font-medium text-blue-700">Go to sign in</Text>
        </Pressable>
      </SectionCard>
    </View>
  );
}
