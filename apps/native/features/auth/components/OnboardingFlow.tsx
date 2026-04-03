import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, ImageBackground, Pressable, Text, View } from "react-native";
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
};

const roles: RoleCard[] = [
  {
    role: "resident",
    icon: "people-outline",
    title: "Resident",
    description: "Barangay community member. Report your safety status and find evacuation centers.",
    path: "Self-register",
    badge: "Community",
  },
  {
    role: "official",
    icon: "shield-outline",
    title: "Official",
    description: "Barangay captain or BDRRMC member. Access the command dashboard and broadcast tools.",
    path: "Pre-assigned account",
    badge: "Command",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, role } = useAuth();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedCard, setSelectedCard] = useState<AppRole | null>(null);

  const snapPoints = useMemo(() => ["55%", "75%"], []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role) return;
    router.replace(role === "official" ? "/(official)/dashboard" : "/(resident)/status");
  }, [isAuthenticated, isLoading, role, router]);

  const handleSelectRole = useCallback(
    (card: RoleCard) => {
      setSelectedCard(card.role);
      setSelectedRole(card.role);
    },
    [],
  );

  const handleContinue = useCallback(() => {
    if (!selectedCard) return;

    if (selectedCard === "official") {
      router.push("/(auth)/sign-in");
    } else {
      router.push("/(auth)/sign-up");
    }
  }, [selectedCard, router]);

  return (
    <View className="flex-1 bg-slate-900">
      {/* Hero background — top half with branding */}
      <View
        className="items-center justify-center"
        style={{ height: SCREEN_HEIGHT * 0.48, paddingTop: insets.top }}
      >
        <Animated.View entering={FadeInDown.delay(200).duration(500)} className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Ionicons name="shield-checkmark" size={32} color="#ffffff" />
          </View>
          <Text className="text-[22px] font-bold text-white">Agap</Text>
          <Text className="text-[13px] text-white/50">Handa. Ligtas. Agap.</Text>
        </Animated.View>
      </View>

      {/* Bottom sheet — role selector */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 36 }}
        enablePanDownToClose={false}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}>
          {/* Header */}
          <View className="mb-5">
            <Text className="text-[22px] font-bold text-slate-900">Who are you?</Text>
            <Text className="mt-1 text-[14px] text-slate-400">Choose your role to continue</Text>
          </View>

          {/* Role cards */}
          <View className="gap-3">
            {roles.map((card, index) => {
              const isSelected = selectedCard === card.role;

              return (
                <Animated.View key={card.role} entering={FadeInDown.delay(300 + index * 100).duration(400)}>
                  <Pressable
                    onPress={() => handleSelectRole(card)}
                    className={`rounded-2xl border-2 p-4 ${
                      isSelected
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                    style={{ minHeight: 100 }}
                  >
                    <View className="flex-row items-start gap-3.5">
                      {/* Icon */}
                      <View
                        className={`h-11 w-11 items-center justify-center rounded-xl ${
                          isSelected ? "bg-slate-900" : "bg-slate-100"
                        }`}
                      >
                        <Ionicons
                          name={card.icon}
                          size={22}
                          color={isSelected ? "#ffffff" : "#64748b"}
                        />
                      </View>

                      {/* Content */}
                      <View className="flex-1">
                        <Text className="text-[16px] font-bold text-slate-900">{card.title}</Text>
                        <Text className="mt-1 text-[13px] leading-4.5 text-slate-500">
                          {card.description}
                        </Text>
                        <View className="mt-2.5 self-start rounded-md bg-blue-50 px-2 py-0.5">
                          <Text className="text-[11px] font-semibold text-blue-600">{card.path}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* CTA button */}
          <View className="mt-5">
            <Pressable
              onPress={handleContinue}
              disabled={!selectedCard}
              className={`min-h-13 items-center justify-center rounded-2xl ${
                selectedCard ? "bg-slate-900" : "bg-slate-200"
              }`}
            >
              <Text
                className={`text-[15px] font-semibold ${
                  selectedCard ? "text-white" : "text-slate-400"
                }`}
              >
                {selectedCard
                  ? `Continue as ${selectedCard === "official" ? "Official" : "Resident"}`
                  : "Select a role"}
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <Text className="mt-4 text-center text-[12px] text-slate-300">
            Your screens and navigation adapt to your role
          </Text>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
