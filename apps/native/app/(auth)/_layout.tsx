import { Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function AuthLayout() {
  return (
    <KeyboardProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack>
    </KeyboardProvider>
  );
}
