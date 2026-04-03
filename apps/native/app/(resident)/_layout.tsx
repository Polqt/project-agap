import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useStore } from "@tanstack/react-store";
import { View } from "react-native";

import { appShellStore } from "@/stores/app-shell-store";

function AlertBadge() {
  const hasUnread = useStore(appShellStore, (s) => s.hasUnreadAlert);
  if (!hasUnread) return null;
  return (
    <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
  );
}

export default function ResidentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A56C4",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#F8FAFC",
          borderTopColor: "#E2E8F0",
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="status"
        options={{
          title: "Status",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="shield-checkmark-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="map-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: "Check-In",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="qr-code-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerto",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons color={color} name="notifications-outline" size={size} />
              <AlertBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
