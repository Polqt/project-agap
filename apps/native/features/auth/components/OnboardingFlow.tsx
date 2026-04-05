import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/shared/hooks/useAuth";
import { setSelectedRole } from "@/stores/app-shell-store";
import type { AppRole } from "@project-agap/api/supabase";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type RoleCard = {
  role: AppRole;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  path: string;
  badge: string;
  accent: string;
  accentSoft: string;
};

const roles: RoleCard[] = [
  {
    role: "resident",
    icon: "people-outline",
    title: "Resident",
    description: "Report your safety status, view alerts, and check routes to evacuation centers.",
    path: "Self-register",
    badge: "Community",
    accent: "#2563eb",
    accentSoft: "#eff6ff",
  },
  {
    role: "official",
    icon: "shield-outline",
    title: "Official",
    description: "Access command tools for registry, broadcasts, welfare checks, and incident reporting.",
    path: "Pre-assigned account",
    badge: "Command",
    accent: "#0f766e",
    accentSoft: "#ecfeff",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, role, session } = useAuth();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedCard, setSelectedCard] = useState<AppRole | null>(null);

  const snapPoints = useMemo(() => ["62%", "84%"], []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role || !session?.user.id) {
      return;
    }

    router.replace(role === "official" ? "/(official)/dashboard" : "/(resident)/status");
  }, [isAuthenticated, isLoading, role, router, session?.user.id]);

  const handleSelectRole = useCallback((card: RoleCard) => {
    setSelectedCard(card.role);
    setSelectedRole(card.role);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedCard) {
      return;
    }

    if (selectedCard === "official") {
      router.push("/(auth)/sign-in");
    } else {
      router.push("/(auth)/sign-up");
    }
  }, [selectedCard, router]);

  return (
    <View className="flex-1 bg-slate-950">
      <View
        className="overflow-hidden px-6"
        style={{ height: SCREEN_HEIGHT * 0.52, paddingTop: insets.top + 20 }}
      >
        <View className="absolute -left-16 top-12 h-40 w-40 rounded-full bg-blue-500/20" />
        <View className="absolute right-0 top-28 h-56 w-56 rounded-full bg-teal-400/15" />
        <View className="absolute bottom-12 left-12 h-24 w-24 rounded-full bg-amber-300/15" />

        <Animated.View entering={FadeInDown.delay(120).duration(450)} className="items-start gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-[24px] bg-white/10">
            <Ionicons name="shield-checkmark" size={30} color="#ffffff" />
          </View>

          <View className="gap-2">
            <Text className="text-[14px] font-semibold uppercase tracking-[1.6px] text-blue-200">
              Disaster response companion
            </Text>
            <Text className="text-[34px] font-bold leading-[40px] tracking-[-1px] text-white">
              Start in the right workspace.
            </Text>
            <Text className="max-w-[20rem] text-[15px] leading-6 text-slate-300">
              AGAP adapts its tools, screens, and workflows based on whether you are a resident or a barangay official.
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(260).duration(480)}
          className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5"
        >
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white/8 p-4">
              <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-slate-300">
                Resident
              </Text>
              <Text className="mt-2 text-[14px] leading-5 text-white">
                Status ping, map, alerts, and household profile.
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/8 p-4">
              <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-slate-300">
                Official
              </Text>
              <Text className="mt-2 text-[14px] leading-5 text-white">
                Dashboard, broadcasts, registry, and reporting tools.
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 32 }}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 44 }}
        enablePanDownToClose={false}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 18 }}>
          <View className="mb-5">
            <Text className="text-[24px] font-bold tracking-[-0.6px] text-slate-900">Choose your role</Text>
            <Text className="mt-1 text-[14px] leading-5 text-slate-500">
              This sets the navigation and tools you see after sign-in.
            </Text>
          </View>

          <View className="gap-3">
            {roles.map((card, index) => {
              const isSelected = selectedCard === card.role;

              return (
                <Animated.View key={card.role} entering={FadeInDown.delay(320 + index * 110).duration(420)}>
                  <Pressable
                    onPress={() => handleSelectRole(card)}
                    className={`rounded-[26px] border p-4 ${isSelected ? "border-slate-900" : "border-slate-200"}`}
                    style={{ backgroundColor: isSelected ? "#f8fafc" : "#ffffff", minHeight: 116 }}
                  >
                    <View className="flex-row items-start gap-3.5">
                      <View
                        className="h-12 w-12 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: isSelected ? card.accent : card.accentSoft }}
                      >
                        <Ionicons
                          name={card.icon}
                          size={22}
                          color={isSelected ? "#ffffff" : card.accent}
                        />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center justify-between gap-3">
                          <Text className="text-[17px] font-bold text-slate-900">{card.title}</Text>
                          <View
                            className="rounded-full px-2.5 py-1"
                            style={{ backgroundColor: card.accentSoft }}
                          >
                            <Text className="text-[11px] font-semibold" style={{ color: card.accent }}>
                              {card.badge}
                            </Text>
                          </View>
                        </View>

                        <Text className="mt-2 text-[13px] leading-5 text-slate-500">
                          {card.description}
                        </Text>

                        <View className="mt-3 flex-row items-center justify-between">
                          <Text className="text-[12px] font-semibold" style={{ color: card.accent }}>
                            {card.path}
                          </Text>
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={20} color={card.accent} />
                          ) : (
                            <Ionicons name="ellipse-outline" size={18} color="#cbd5e1" />
                          )}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          <View className="mt-5">
            <Pressable
              onPress={handleContinue}
              disabled={!selectedCard}
              className={`min-h-14 items-center justify-center rounded-2xl ${
                selectedCard ? "bg-slate-950" : "bg-slate-200"
              }`}
            >
              <Text
                className={`text-[15px] font-semibold ${
                  selectedCard ? "text-white" : "text-slate-400"
                }`}
              >
                {selectedCard
                  ? `Continue as ${selectedCard === "official" ? "Official" : "Resident"}`
                  : "Select a role to continue"}
              </Text>
            </Pressable>
          </View>

          <Text className="mt-4 text-center text-[12px] leading-5 text-slate-400">
            You can still switch accounts later by signing out and choosing a different role.
          </Text>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
