import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { i18n } from "@/shared/i18n";

export default function OfficialLayout() {
  const { t } = useTranslation();
  const [langKey, setLangKey] = useState(i18n.language);

  useEffect(() => {
    const handler = (lang: string) => setLangKey(lang);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  return (
    <Tabs key={langKey}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A56C4",
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("dashboard.title"),
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="grid-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="registry"
        options={{
          title: t("registry.title"),
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="list-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: t("broadcast.title"),
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="megaphone-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t("welfare.title"),
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="document-text-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("profile.title"),
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="person-circle-outline" size={size} />,
        }}
      />
    </Tabs>
  );
}
