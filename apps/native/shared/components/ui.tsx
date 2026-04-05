import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type PillTone = "neutral" | "info" | "success" | "warning" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-slate-900",
  secondary: "bg-slate-700",
  danger: "bg-rose-600",
  ghost: "border border-slate-200 bg-transparent",
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
      <View className="gap-3">
        <View className="gap-2">
          <Text className="text-2xl font-bold leading-tight text-slate-950">{title}</Text>
          {description ? <Text className="text-sm leading-5 text-slate-600">{description}</Text> : null}
        </View>
        {action ? <View className="self-start">{action}</View> : null}
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
    <View className="mx-6 mt-4 rounded-2xl border border-slate-200 bg-white p-4">
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
  size = "default",
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Larger touch targets and text for kiosk / field tablets. */
  size?: "default" | "kiosk";
}) {
  const muted = disabled || loading;
  const sizeClasses =
    size === "kiosk" ? "min-h-[72px] rounded-2xl px-6" : "min-h-[48px] rounded-xl px-4";
  const textClasses =
    size === "kiosk" ? "text-xl font-bold" : "text-[14px] font-semibold";

  return (
    <Pressable
      onPress={onPress}
      disabled={muted}
      className={`items-center justify-center ${sizeClasses} ${buttonVariants[variant]} ${muted ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#0f172a" : "#ffffff"} />
      ) : (
        <Text className={`${textClasses} ${variant === "ghost" ? "text-slate-900" : "text-white"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  multiline?: boolean;
  error?: string;
  helperText?: string;
} & Omit<TextInputProps, "value" | "onChangeText" | "defaultValue" | "children">;

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    multiline,
    error,
    helperText,
    ...textInputProps
  },
  ref,
) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-xl border px-4 py-3 text-[15px] text-slate-900 ${multiline ? "min-h-28" : "min-h-11"} ${error ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50"}`}
        placeholderTextColor="#94a3b8"
        {...textInputProps}
      />
      {error ? <Text className="text-sm text-rose-600">{error}</Text> : null}
      {!error && helperText ? <Text className="text-sm text-slate-500">{helperText}</Text> : null}
    </View>
  );
});

export function Pill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  return (
    <Text className={`self-start rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${pillVariants[tone]}`}>
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
    <View className="min-w-[46%] flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
    <View className="items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6">
      <Text className="text-[14px] font-semibold text-slate-600">{title}</Text>
      <Text className="mt-1.5 text-center text-[13px] leading-5 text-slate-400">{description}</Text>
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

export type SpeedDialAction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SpeedDialFab({ actions }: { actions: SpeedDialAction[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  function toggle() {
    setIsOpen((prev) => {
      const next = !prev;
      rotation.value = withSpring(next ? 45 : 0, { damping: 15 });
      opacity.value = withTiming(next ? 1 : 0, { duration: 150 });
      return next;
    });
  }

  function handleAction(action: SpeedDialAction) {
    setIsOpen(false);
    rotation.value = withSpring(0, { damping: 15 });
    opacity.value = withTiming(0, { duration: 100 });
    action.onPress();
  }

  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value > 0.5 ? "auto" : "none",
  }));

  return (
    <View className="items-end px-5">
      {isOpen ? (
        <Pressable
          onPress={toggle}
          className="absolute -top-150 -left-100 h-200 w-125"
        />
      ) : null}

      <Animated.View style={menuStyle} className="mb-3 items-end gap-3">
        {actions.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => handleAction(action)}
            className="flex-row items-center gap-3"
          >
            <View className="rounded-lg bg-slate-800 px-3 py-2">
              <Text className="text-sm font-medium text-white">{action.label}</Text>
            </View>
            <View
              className="h-12 w-12 items-center justify-center rounded-full shadow-sm"
              style={{ backgroundColor: action.color }}
            >
              <Ionicons name={action.icon} size={22} color="white" />
            </View>
          </Pressable>
        ))}
      </Animated.View>

      <AnimatedPressable
        onPress={toggle}
        style={mainButtonStyle}
        className="h-14 w-14 items-center justify-center rounded-full bg-blue-700 shadow-lg"
      >
        <Ionicons name="add" size={28} color="white" />
      </AnimatedPressable>
    </View>
  );
}
