import { Controller } from "react-hook-form";
import { Text, TextInput, View } from "react-native";

import { AppButton, TextField } from "@/shared/components/ui";

import { SignUpStepHeader } from "./SignUpShared";
import type { SignUpFormActions, SignUpFormState, SignUpRefs } from "../types";

type Props = Pick<SignUpFormState, "form"> &
  Pick<SignUpFormActions, "goNext"> &
  Pick<
    SignUpRefs,
    "fullNameRef" | "phoneRef" | "emailRef" | "passwordRef" | "confirmPasswordRef"
  >;

export function SignUpStepDetails({
  form,
  goNext,
  fullNameRef,
  phoneRef,
  emailRef,
  passwordRef,
  confirmPasswordRef,
}: Props) {
  return (
    <View className="gap-5">
      <SignUpStepHeader step={0} title="Your details" />

      <Controller
        control={form.control}
        name="fullName"
        render={({ field, fieldState }) => (
          <TextField
            ref={fullNameRef}
            label="Full name"
            value={field.value ?? ""}
            onChangeText={field.onChange}
            placeholder="e.g. Maria Dela Cruz"
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
          <View className="gap-2">
            <Text className="text-[13px] font-medium text-slate-600">Mobile number</Text>
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50">
              <Text className="px-3.5 text-[15px] text-slate-400">+63</Text>
              <View className="h-8 w-px bg-slate-200" />
              <TextInput
                ref={phoneRef}
                value={field.value ?? ""}
                onChangeText={field.onChange}
                placeholder="9XX XXX XXXX"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
                className="min-h-11 flex-1 px-3 text-[15px] text-slate-900"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {fieldState.error?.message ? (
              <Text className="text-[12px] text-rose-500">{fieldState.error.message}</Text>
            ) : (
              <Text className="text-[11px] text-slate-400">
                For SMS alerts when push is unavailable.
              </Text>
            )}
          </View>
        )}
      />

      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            ref={emailRef}
            label="Email address"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="your@email.com"
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
            placeholder="Min. 8 characters"
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
            returnKeyType="done"
            onSubmitEditing={() => void goNext()}
            error={fieldState.error?.message}
          />
        )}
      />

      <AppButton label="Next" onPress={() => void goNext()} />
    </View>
  );
}
