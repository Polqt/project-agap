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

import { markWelcomeSeen } from "@/services/onboarding";
import { appShellStore } from "@/stores/app-shell-store";
import { useAuth } from "@/shared/hooks/useAuth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
  accentColor: string;
  title: string;
  description: string;
  metric: string;
  caption: string;
};

const residentSlides: Slide[] = [
  {
    icon: "shield-checkmark-outline",
    bgColor: "#eff6ff",
    iconColor: "#2563eb",
    accentColor: "#dbeafe",
    title: "Ping your safety in one tap",
    description:
      "During an active alert, tell your barangay that you're safe or that you need help with a single tap.",
    metric: "1 tap",
    caption: "Fast resident status ping",
  },
  {
    icon: "navigate-outline",
    bgColor: "#ecfdf5",
    iconColor: "#059669",
    accentColor: "#d1fae5",
    title: "Find the nearest center",
    description:
      "The map highlights open evacuation centers with cached routes so guidance stays usable even with weak data.",
    metric: "Offline map",
    caption: "Pinned location and route overlay",
  },
  {
    icon: "megaphone-outline",
    bgColor: "#fef3c7",
    iconColor: "#d97706",
    accentColor: "#fde68a",
    title: "Alerts go straight to you",
    description:
      "Barangay officials can send evacuation orders and updates directly to your phone through push and SMS.",
    metric: "Push + SMS",
    caption: "Critical updates reach you faster",
  },
];

const officialSlides: Slide[] = [
  {
    icon: "grid-outline",
    bgColor: "#eff6ff",
    iconColor: "#2563eb",
    accentColor: "#dbeafe",
    title: "Your command dashboard",
    description:
      "Monitor household accountability, resolve help pings, and coordinate welfare actions from one surface.",
    metric: "Live ops",
    caption: "Households, pings, and queues",
  },
  {
    icon: "megaphone-outline",
    bgColor: "#ecfdf5",
    iconColor: "#059669",
    accentColor: "#d1fae5",
    title: "Broadcast in one tap",
    description:
      "Send evacuation orders to the whole barangay or to a specific purok with fast SMS fan-out.",
    metric: "Rapid send",
    caption: "Targeted barangay communication",
  },
  {
    icon: "document-text-outline",
    bgColor: "#fef3c7",
    iconColor: "#d97706",
    accentColor: "#fde68a",
    title: "Generate reports instantly",
    description:
      "Use built-in reporting tools to assemble incident and needs updates for municipal coordination.",
    metric: "Field-ready",
    caption: "Shorter reporting time",
  },
];

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <View style={{ width: SCREEN_WIDTH - 48 }} className="items-center">
      <View
        className="mb-6 w-full overflow-hidden rounded-4xl px-6 py-7"
        style={{ backgroundColor: slide.bgColor }}
      >
        <View
          className="absolute -right-10 -top-8 h-32 w-32 rounded-full"
          style={{ backgroundColor: slide.accentColor }}
        />
        <View
          className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full"
          style={{ backgroundColor: slide.accentColor }}
        />

        <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: slide.accentColor }}>
          <Text className="text-[12px] font-semibold" style={{ color: slide.iconColor }}>
            {slide.metric}
          </Text>
        </View>

        <View className="mt-5 h-20 w-20 items-center justify-center rounded-3xl bg-white/80">
          <Ionicons name={slide.icon} size={36} color={slide.iconColor} />
        </View>

        <View className="mt-8 rounded-2xl bg-white/72 px-4 py-3">
          <Text className="text-[12px] font-semibold uppercase tracking-[1.2px] text-slate-500">
            {slide.caption}
          </Text>
        </View>
      </View>

      <Text className="text-center text-[24px] font-bold tracking-[-0.5px] text-slate-900">
        {slide.title}
      </Text>
      <Text className="mt-3 text-center text-[15px] leading-6 text-slate-500">
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
          className={`rounded-full ${i === activeIndex ? "h-2.5 w-6 bg-slate-950" : "h-2.5 w-2.5 bg-slate-300"}`}
        />
      ))}
    </View>
  );
}

export function WelcomePager() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role, profile, session } = useAuth();
  const selectedRole = useStore(appShellStore, (state) => state.selectedRole);
  const resolvedRole = role ?? selectedRole;
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = resolvedRole === "official" ? officialSlides : residentSlides;
  const isLast = activeIndex === slides.length - 1;
  const userName = profile?.full_name?.split(" ")[0] ?? "there";

  const goToHome = useCallback(async () => {
    if (resolvedRole && session?.user.id) {
      await markWelcomeSeen(session.user.id, resolvedRole);
    }

    if (resolvedRole === "official") {
      router.replace("/(official)/dashboard");
    } else {
      router.replace("/(resident)/status");
    }
  }, [resolvedRole, router, session?.user.id]);

  const goNext = useCallback(() => {
    if (isLast) {
      void goToHome();
      return;
    }

    flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  }, [activeIndex, goToHome, isLast]);

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
      <View className="px-6 pb-5">
        <View className="flex-row items-center justify-between">
          <View className="rounded-full bg-slate-100 px-3 py-1.5">
            <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-slate-600">
              {resolvedRole === "official" ? "Official setup" : "Resident setup"}
            </Text>
          </View>
          <Pressable onPress={() => void goToHome()} hitSlop={8}>
            <Text className="text-[14px] font-medium text-blue-600">Skip</Text>
          </Pressable>
        </View>

        <View className="mt-5">
          <Text className="text-[30px] font-bold tracking-[-0.8px] text-slate-900">
            Welcome, {userName}
          </Text>
          <Text className="mt-2 text-[15px] leading-6 text-slate-500">
            A quick tour before you land in your main workspace.
          </Text>
        </View>
      </View>

      <View className="px-6 pb-3">
        <View className="rounded-[28px] bg-slate-950 px-5 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
              <Ionicons
                name={resolvedRole === "official" ? "shield-checkmark" : "navigate"}
                size={20}
                color="#ffffff"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-white">
                {resolvedRole === "official" ? "Command center ready" : "Prepared for check-ins and alerts"}
              </Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-300">
                {resolvedRole === "official"
                  ? "Broadcast, registry, and reporting tools are organized for fast field use."
                  : "Safety ping, evacuation map, and alerts are set up for quick access."}
              </Text>
            </View>
          </View>
        </View>
      </View>

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

      <View className="gap-5 px-6" style={{ paddingBottom: insets.bottom + 20 }}>
        <DotIndicator count={slides.length} activeIndex={activeIndex} />

        <View className="flex-row gap-3">
          {activeIndex > 0 ? (
            <Pressable
              onPress={goBack}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white"
            >
              <Text className="text-[14px] font-semibold text-slate-700">Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={goNext}
            className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-slate-950"
          >
            <Text className="text-[14px] font-semibold text-white">
              {isLast ? "Open AGAP" : "Next"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
