import "@/global.css";
import "@/shared/i18n";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { Fragment, useEffect, useState, type PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { AuthProvider } from "@/providers/AuthProvider";
import { OfflineDataProvider } from "@/providers/OfflineDataProvider";
import { OfflineQueueProvider } from "@/providers/OfflineQueueProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { RealtimeSyncProvider } from "@/providers/RealtimeSyncProvider";
import { OfflineBanner } from "@/shared/components/offline-banner";
import { i18n, loadPersistedLanguage } from "@/shared/i18n";

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
  const [langKey, setLangKey] = useState(i18n.language);

  useEffect(() => {
    void loadPersistedLanguage();

    // Re-key the navigator whenever language changes so all screens
    // unmount/remount and pick up new static strings.
    const handler = (lang: string) => setLangKey(lang);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BootKeyboardProvider>
        <QueryProvider>
          <AppThemeProvider>
            <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
              <AuthProvider>
                <OfflineQueueProvider>
                  <OfflineDataProvider>
                    <RealtimeSyncProvider>
                      <OfflineBanner />
                      <Stack key={langKey} screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="welcome" />
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
                  </OfflineDataProvider>
                </OfflineQueueProvider>
              </AuthProvider>
            </HeroUINativeProvider>
          </AppThemeProvider>
        </QueryProvider>
      </BootKeyboardProvider>
    </GestureHandlerRootView>
    </I18nextProvider>
  );
}
