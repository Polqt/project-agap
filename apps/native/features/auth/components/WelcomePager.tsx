import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@tanstack/react-store";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  type ViewToken,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appShellStore } from "@/stores/app-shell-store";
import { useAuth } from "@/shared/hooks/useAuth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
  title: string;
  description: string;
};

const residentSlides: Slide[] = [
  {
    icon: "shield-checkmark-outline",
    bgColor: "#eff6ff",
    iconColor: "#2563eb",
    title: "Ping your safety in one tap",
    description:
      "During an active alert, tell your barangay you're safe — or that you need help — with a single tap. Works offline too.",
  },
  {
    icon: "navigate-outline",
    bgColor: "#ecfdf5",
    iconColor: "#059669",
    title: "Find the nearest center",
    description:
      "The map shows open evacuation centers sorted by distance. Routes are cached — no internet needed to navigate during the storm.",
  },
  {
    icon: "megaphone-outline",
    bgColor: "#fef3c7",
    iconColor: "#d97706",
    title: "Alerts go straight to you",
    description:
      "Your barangay officials can broadcast evacuation orders directly to your phone via push and SMS — even when data is slow.",
  },
];

const officialSlides: Slide[] = [
  {
    icon: "grid-outline",
    bgColor: "#eff6ff",
    iconColor: "#2563eb",
    title: "Your command dashboard",
    description:
      "Monitor household accountability, resolve help pings, and coordinate welfare checks — all in one live surface.",
  },
  {
    icon: "megaphone-outline",
    bgColor: "#ecfdf5",
    iconColor: "#059669",
    title: "Broadcast in one tap",
    description:
      "Push evacuation orders to the entire barangay or a specific purok. SMS fan-out starts immediately.",
  },
  {
    icon: "document-text-outline",
    bgColor: "#fef3c7",
    iconColor: "#d97706",
    title: "Generate reports instantly",
    description:
      "AI-powered incident summaries and needs reports ready to copy and submit to your municipal DRRMC.",
  },
];

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <View style={{ width: SCREEN_WIDTH - 48 }} className="items-center">
      {/* Illustration area */}
      <View
        className="mb-5 h-48 w-full items-center justify-center rounded-2xl"
        style={{ backgroundColor: slide.bgColor }}
      >
        <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
      </View>

      <Text className="text-center text-[18px] font-bold text-slate-900">{slide.title}</Text>
      <Text className="mt-2 text-center text-[14px] leading-5 text-slate-500">
        {slide.description}
      </Text>
    </View>
  );
}

function DotIndicator({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className={`rounded-full ${i === activeIndex ? "h-2 w-2 bg-blue-600" : "h-1.5 w-1.5 bg-slate-300"}`}
        />
      ))}
    </View>
  );
}

export function WelcomePager() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const selectedRole = useStore(appShellStore, (state) => state.selectedRole);
  const resolvedRole = role ?? selectedRole;
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = resolvedRole === "official" ? officialSlides : residentSlides;
  const isLast = activeIndex === slides.length - 1;

  const userName = "there"; // placeholder — could pull from profile

  const goToHome = useCallback(() => {
    if (resolvedRole === "official") {
      router.replace("/(official)/dashboard");
    } else {
      router.replace("/(resident)/status");
    }
  }, [resolvedRole, router]);

  const goNext = useCallback(() => {
    if (isLast) {
      goToHome();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }, [activeIndex, isLast, goToHome]);

  const goBack = useCallback(() => {
    if (activeIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
    }
  }, [activeIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 12 }}>
      {/* Top bar: greeting + skip */}
      <View className="flex-row items-center justify-between px-6 pb-4">
        <Text className="text-[18px] font-bold text-slate-900">Welcome, {userName}!</Text>
        <Pressable onPress={goToHome} hitSlop={8}>
          <Text className="text-[14px] font-medium text-blue-600">Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <View className="flex-1 justify-center">
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24 }}>
              <SlideCard slide={item} />
            </View>
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
      </View>

      {/* Bottom: dots + nav buttons */}
      <View
        className="gap-5 px-6"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <DotIndicator count={slides.length} activeIndex={activeIndex} />

        <View className="flex-row gap-3">
          {activeIndex > 0 ? (
            <Pressable
              onPress={goBack}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-200"
            >
              <Text className="text-[14px] font-semibold text-slate-700">Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={goNext}
            className="min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-600"
          >
            <Text className="text-[14px] font-semibold text-white">
              {isLast ? "Get started" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
