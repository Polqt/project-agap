import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type PillTone = "neutral" | "info" | "success" | "warning" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-blue-700",
  secondary: "bg-slate-900",
  danger: "bg-rose-700",
  ghost: "border border-slate-300 bg-transparent",
};

const pillVariants: Record<PillTone, string> = {
  neutral: "bg-slate-200 text-slate-700",
  info: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

export function ScreenHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="gap-2 px-5 pt-6">
      {eyebrow ? (
        <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-blue-700">
          {eyebrow}
        </Text>
      ) : null}
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-2">
          <Text className="text-3xl font-bold text-slate-950">{title}</Text>
          {description ? <Text className="text-sm leading-6 text-slate-600">{description}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  right,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View className="mx-5 mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      {title || subtitle || right ? (
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-1">
            {title ? <Text className="text-lg font-semibold text-slate-950">{title}</Text> : null}
            {subtitle ? <Text className="text-sm leading-6 text-slate-500">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}) {
  const muted = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={muted}
      className={`min-h-14 items-center justify-center rounded-2xl px-4 ${buttonVariants[variant]} ${muted ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#0f172a" : "#ffffff"} />
      ) : (
        <Text className={`text-base font-semibold ${variant === "ghost" ? "text-slate-900" : "text-white"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  error,
  helperText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  multiline?: boolean;
  error?: string;
  helperText?: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl border px-4 py-3 text-base text-slate-950 ${multiline ? "min-h-28" : "min-h-14"} ${error ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-slate-50"}`}
        placeholderTextColor="#94a3b8"
      />
      {error ? <Text className="text-sm text-rose-600">{error}</Text> : null}
      {!error && helperText ? <Text className="text-sm text-slate-500">{helperText}</Text> : null}
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  return (
    <Text className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${pillVariants[tone]}`}>
      {label}
    </Text>
  );
}

export function StatCard({
  label,
  value,
  caption,
  tone = "info",
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: PillTone;
}) {
  return (
    <View className="min-w-[46%] flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <Pill label={label} tone={tone} />
      <Text className="mt-4 text-3xl font-bold text-slate-950">{value}</Text>
      {caption ? <Text className="mt-2 text-sm text-slate-500">{caption}</Text> : null}
    </View>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8">
      <Text className="text-lg font-semibold text-slate-900">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-slate-500">{description}</Text>
    </View>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text className="flex-1 text-sm text-slate-500">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium text-slate-900">{value}</Text>
    </View>
  );
}
