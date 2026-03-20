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
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(resident)" />
                    <Stack.Screen name="(official)" />
                    <Stack.Screen
                      name="(shared)/check-in"
                      options={{ presentation: "modal", headerShown: true, title: "Check In" }}
                    />
                    <Stack.Screen
                      name="(shared)/alert-detail"
                      options={{ presentation: "modal", headerShown: true, title: "Alert" }}
                    />
                    <Stack.Screen
                      name="(shared)/kiosk"
                      options={{ presentation: "modal", headerShown: true, title: "Kiosk" }}
                    />
                    <Stack.Screen
                      name="(shared)/welfare-check"
                      options={{ presentation: "modal", headerShown: true, title: "Welfare Check" }}
                    />
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
