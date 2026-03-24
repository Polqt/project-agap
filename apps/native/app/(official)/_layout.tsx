import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function OfficialLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A56C4",
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="grid-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="registry"
        options={{
          title: "Registry",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="list-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: "Broadcast",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="megaphone-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="document-text-outline" size={size} />,
        }}
      />
    </Tabs>
  );
}
