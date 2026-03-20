import type { Barangay } from "@project-agap/api/supabase";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Button } from "heroui-native";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { SectionCard } from "@/components/app/section-card";
import { TextField } from "@/components/app/text-field";
import { useAuth } from "@/providers/AuthProvider";
import { haptics } from "@/services/haptics";
import { supabase } from "@/services/supabase";
import { getErrorMessage } from "@/utils/format";
import { trpc, trpcClient } from "@/utils/trpc";
import { signUpSchema } from "@/utils/validation";

type SignUpValues = z.infer<typeof signUpSchema>;

const STEPS = [
  { title: "Personal info", description: "Your resident account details." },
  { title: "Barangay", description: "Choose your community assignment." },
  { title: "Purok", description: "Add your purok to finish setup." },
] as const;

const BarangayRow = memo(function BarangayRow({
  isSelected,
  item,
  onPress,
}: {
  isSelected: boolean;
  item: Barangay;
  onPress: (item: Barangay) => void;
}) {
  return (
    <Pressable
      className={`mb-3 rounded-2xl border px-4 py-4 ${
        isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
      }`}
      onPress={() => onPress(item)}
    >
      <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
      <Text className="mt-1 text-sm text-slate-600">
        {item.municipality}, {item.province}
      </Text>
    </Pressable>
  );
});

export function SignUpForm() {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const barangaysQuery = useQuery(trpc.barangays.listAll.queryOptions());
  const {
    control,
    formState: { errors },
    handleSubmit,
    setValue,
    trigger,
    watch,
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      phone_number: "",
      barangay_id: "",
      purok: "",
    },
  });

  const nextStep = useCallback(async () => {
    const fields =
      step === 0
        ? (["full_name", "email", "password", "phone_number"] as const)
        : step === 1
          ? (["barangay_id"] as const)
          : (["purok"] as const);

    const isValid = await trigger(fields);
    if (isValid) {
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }
  }, [step, trigger]);

  const handleBarangayPress = useCallback(
    (item: Barangay) => {
      setValue("barangay_id", item.id, { shouldValidate: true });
    },
    [setValue],
  );

  const renderBarangay = useCallback(
    ({ item }: { item: Barangay }) => (
      <BarangayRow
        isSelected={watch("barangay_id") === item.id}
        item={item}
        onPress={handleBarangayPress}
      />
    ),
    [handleBarangayPress, watch],
  );

  const selectedBarangayName = useMemo(
    () => barangaysQuery.data?.find((item) => item.id === watch("barangay_id"))?.name,
    [barangaysQuery.data, watch],
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      setErrorMessage(null);
      setIsSubmitting(true);
      await haptics.medium();

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            role: "resident",
            full_name: values.full_name,
            phone_number: values.phone_number || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        await trpcClient.profile.update.mutate({
          fullName: values.full_name,
          phoneNumber: values.phone_number || null,
          barangayId: values.barangay_id,
          purok: values.purok || null,
        });
        await refreshProfile();
        await haptics.success();
        router.replace("/(resident)/map");
        return;
      }

      router.replace("/(auth)/sign-in");
    } catch (error) {
      await haptics.error();
      setErrorMessage(getErrorMessage(error, "Hindi matapos ang registration. Subukan muli."));
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-6">
          <View className="gap-3 pt-4">
            <Pressable onPress={() => (step === 0 ? router.replace("/onboarding") : setStep(step - 1))}>
              <Text className="text-sm font-medium text-blue-700">Bumalik</Text>
            </Pressable>
            <Text className="text-4xl font-semibold text-slate-950">Resident Registration</Text>
            <Text className="text-base leading-7 text-slate-600">
              Kumpletuhin ang iyong account para handa ka sa alerts, check-in, at status updates.
            </Text>
          </View>

          <View className="mt-6 flex-row gap-2">
            {STEPS.map((item, index) => (
              <View
                key={item.title}
                className={`h-2 flex-1 rounded-full ${index <= step ? "bg-blue-600" : "bg-slate-200"}`}
              />
            ))}
          </View>

          <Text className="mt-3 text-sm font-medium text-slate-600">
            Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          </Text>

          <View className="mt-6 flex-1">
            {step === 0 ? (
              <SectionCard title="Personal information" description={STEPS[step].description}>
                <View className="gap-4">
                  <Controller
                    control={control}
                    name="full_name"
                    render={({ field }) => (
                      <TextField
                        label="Full name"
                        error={errors.full_name?.message}
                        onChangeText={field.onChange}
                        placeholder="Juan Dela Cruz"
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <TextField
                        autoCapitalize="none"
                        keyboardType="email-address"
                        label="Email"
                        error={errors.email?.message}
                        onChangeText={field.onChange}
                        placeholder="juan@example.com"
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="password"
                    render={({ field }) => (
                      <TextField
                        label="Password"
                        error={errors.password?.message}
                        onChangeText={field.onChange}
                        placeholder="At least 8 characters"
                        secureTextEntry
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="phone_number"
                    render={({ field }) => (
                      <TextField
                        keyboardType="phone-pad"
                        label="Phone number"
                        hint="Optional"
                        error={errors.phone_number?.message}
                        onChangeText={field.onChange}
                        placeholder="09XXXXXXXXX"
                        value={field.value}
                      />
                    )}
                  />
                </View>
              </SectionCard>
            ) : null}

            {step === 1 ? (
              <SectionCard title="Select your barangay" description={STEPS[step].description}>
                <FlashList
                  data={barangaysQuery.data ?? []}
                  keyExtractor={(item) => item.id}
                  renderItem={renderBarangay}
                  showsVerticalScrollIndicator={false}
                />
                {errors.barangay_id?.message ? (
                  <Text className="text-sm text-rose-600">{errors.barangay_id.message}</Text>
                ) : null}
              </SectionCard>
            ) : null}

            {step === 2 ? (
              <SectionCard
                title="Final details"
                description={selectedBarangayName ? `Barangay: ${selectedBarangayName}` : STEPS[step].description}
              >
                <Controller
                  control={control}
                  name="purok"
                  render={({ field }) => (
                    <TextField
                      label="Purok"
                      hint="Optional"
                      error={errors.purok?.message}
                      onChangeText={field.onChange}
                      placeholder="Purok 3"
                      value={field.value}
                    />
                  )}
                />
              </SectionCard>
            ) : null}
          </View>

          {errorMessage ? (
            <Text className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </Text>
          ) : null}

          <View className="gap-3 pb-2">
            {step < STEPS.length - 1 ? (
              <Button className="rounded-2xl bg-[#1A56C4]" onPress={() => void nextStep()}>
                <Button.Label className="font-semibold text-white">Susunod</Button.Label>
              </Button>
            ) : (
              <Button className="rounded-2xl bg-[#1A56C4]" isDisabled={isSubmitting} onPress={onSubmit}>
                <Button.Label className="font-semibold text-white">
                  {isSubmitting ? "Nirerehistro..." : "Gumawa ng account"}
                </Button.Label>
              </Button>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
