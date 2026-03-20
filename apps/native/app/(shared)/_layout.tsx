import { Stack } from "expo-router";

export default function SharedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="alert-detail" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="kiosk" />
      <Stack.Screen name="welfare-check" />
    </Stack>
  );
}
