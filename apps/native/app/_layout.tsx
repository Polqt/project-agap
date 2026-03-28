import "@/global.css";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { Fragment, type PropsWithChildren } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { AuthProvider } from "@/providers/AuthProvider";
import { OfflineQueueProvider } from "@/providers/OfflineQueueProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { RealtimeSyncProvider } from "@/providers/RealtimeSyncProvider";

export const unstable_settings = {
  initialRouteName: "index",
};

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

function BootKeyboardProvider({ children }: PropsWithChildren) {
  if (isExpoGo()) {
    return <Fragment>{children}</Fragment>;
  }

  try {
    const keyboardControllerModule = require("react-native-keyboard-controller") as {
      KeyboardProvider: React.ComponentType<PropsWithChildren>;
    };
    const KeyboardProvider = keyboardControllerModule.KeyboardProvider;

    return <KeyboardProvider>{children}</KeyboardProvider>;
  } catch {
    return <Fragment>{children}</Fragment>;
  }
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BootKeyboardProvider>
        <QueryProvider>
          <AppThemeProvider>
            <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
              <AuthProvider>
                <OfflineQueueProvider>
                  <RealtimeSyncProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="onboarding" />
                      <Stack.Screen name="modal" />
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="(resident)" />
                      <Stack.Screen name="(official)" />
                      {/*
                       * Register the whole (shared) group here.
                       * Individual screen options (modal, title) live inside
                       * app/(shared)/_layout.tsx so expo-router can resolve them.
                       */}
                      <Stack.Screen name="(shared)" options={{ headerShown: false }} />
                    </Stack>
                  </RealtimeSyncProvider>
                </OfflineQueueProvider>
              </AuthProvider>
            </HeroUINativeProvider>
          </AppThemeProvider>
        </QueryProvider>
      </BootKeyboardProvider>
    </GestureHandlerRootView>
  );
}
