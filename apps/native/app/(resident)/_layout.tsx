import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

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
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="map-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: "Status",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="heart-half-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="notifications-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-circle-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
