import { Redirect, router } from "expo-router";
import { Button, Card } from "heroui-native";
import { useEffect } from "react";
import { BackHandler, Text, View } from "react-native";

import { useAuth } from "@/providers/AuthProvider";
import { haptics } from "@/services/haptics";
import { T } from "@/utils/i18n";

function RoleCard({
  title,
  subtitle,
  description,
  actionLabel,
  onPress,
  accentClassName,
}: {
  title: string;
  subtitle: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
  accentClassName: string;
}) {
  return (
    <Card className={`rounded-[28px] border border-white/10 p-5 ${accentClassName}`}>
      <View className="gap-4">
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-white/70">
            {subtitle}
          </Text>
          <Card.Title className="text-2xl text-white">{title}</Card.Title>
          <Text className="text-sm leading-6 text-white/80">{description}</Text>
        </View>
        <Button
          className="rounded-2xl bg-white/95"
          onPress={() => {
            void haptics.light();
            onPress();
          }}
        >
          <Button.Label className="font-semibold text-slate-900">{actionLabel}</Button.Label>
        </Button>
      </View>
    </Card>
  );
}

export function RolePicker() {
  const { profile, session } = useAuth();

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  if (session && profile?.role === "official") {
    return <Redirect href="/(official)/dashboard" />;
  }

  if (session && profile?.role === "resident") {
    return <Redirect href="/(resident)/map" />;
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="absolute -left-10 top-10 h-44 w-44 rounded-full bg-blue-500/25" />
      <View className="absolute right-0 top-52 h-56 w-56 rounded-full bg-cyan-400/15" />
      <View className="flex-1 px-6 py-8">
        <View className="mt-10 gap-3">
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-blue-200">
            Barangay-first preparedness
          </Text>
          <Text className="text-5xl font-semibold leading-14 text-white">{T.roleQuestion}</Text>
          <Text className="max-w-sm text-base leading-7 text-slate-300">{T.roleSubtitle}</Text>
        </View>

        <View className="mt-10 gap-5">
          <RoleCard
            title={T.resident}
            subtitle="Resident"
            description="Mag-sign up para makita ang evacuation map, alerts, at mabilis na status ping para sa pamilya mo."
            actionLabel="Magpatuloy bilang residente"
            accentClassName="bg-[#1A56C4]"
            onPress={() => router.push("/(auth)/sign-up")}
          />
          <RoleCard
            title={T.official}
            subtitle="Official"
            description="Pumasok gamit ang official account para makita ang dashboard, household status, at response priorities."
            actionLabel="Mag-sign in bilang opisyal"
            accentClassName="bg-[#0F3A8A]"
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </View>
      </View>
    </View>
  );
}
