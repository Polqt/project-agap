import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useAuth } from "@/shared/hooks/useAuth";

export function SplashScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, role } = useAuth();
  const hasNavigated = useRef(false);

  // Subtle loading bar animation
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [barWidth]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 40 + 10}%`,
  }));

  useEffect(() => {
    if (isLoading || hasNavigated.current) return;

    hasNavigated.current = true;

    if (isAuthenticated && role) {
      router.replace(role === "official" ? "/(official)/dashboard" : "/(resident)/status");
    } else {
      // Auto-advance to role selector after brief splash
      const timer = setTimeout(() => {
        router.replace("/onboarding");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, role, router]);

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      className="flex-1 items-center justify-center bg-white"
    >
      {/* Logo area */}
      <View className="items-center gap-4">
        <View className="h-20 w-20 items-center justify-center rounded-2xl bg-slate-900">
          <Ionicons name="shield-checkmark" size={40} color="#ffffff" />
        </View>

        <View className="items-center gap-1">
          <Text className="text-[28px] font-bold tracking-[-0.6px] text-slate-900">Agap</Text>
          <Text className="text-[14px] text-slate-400">Handa. Ligtas. Agap.</Text>
        </View>
      </View>

      {/* Subtle loading bar */}
      <View className="absolute bottom-32 w-48">
        <View className="h-0.75 overflow-hidden rounded-full bg-slate-100">
          <Animated.View style={barStyle} className="h-full rounded-full bg-slate-900" />
        </View>
        <Text className="mt-3 text-center text-[11px] text-slate-300">
          BDRRMC-ready &middot; Offline-first
        </Text>
      </View>
    </Animated.View>
  );
}
