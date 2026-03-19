import { Text, TextInput, View, type TextInputProps } from "react-native";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, ...props }: TextFieldProps) {
  return (
    <View className="gap-2">
      <View className="gap-1">
        <Text className="text-sm font-medium text-slate-800">{label}</Text>
        {hint ? <Text className="text-xs text-slate-500">{hint}</Text> : null}
      </View>
      <TextInput
        placeholderTextColor="#94A3B8"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900"
        {...props}
      />
      {error ? <Text className="text-sm text-rose-600">{error}</Text> : null}
    </View>
  );
}
