import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { AuthProvider } from "@/providers/AuthProvider";
import { OfflineQueueProvider } from "@/providers/OfflineQueueProvider";
import { QueryProvider } from "@/providers/QueryProvider";

export const unstable_settings = {
  initialRouteName: "(resident)",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <AuthProvider>
                <OfflineQueueProvider>
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
                </OfflineQueueProvider>
              </AuthProvider>
            </HeroUINativeProvider>
          </AppThemeProvider>
        </QueryProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}