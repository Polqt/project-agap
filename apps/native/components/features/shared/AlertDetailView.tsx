import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";

import { EmptyState } from "@/components/app/empty-state";
import { SectionCard } from "@/components/app/section-card";
import { haptics } from "@/services/haptics";
import { formatRelativeTime, getHazardIconName, getSeverityMeta } from "@/utils/format";
import { trpc } from "@/utils/trpc";

export function AlertDetailView() {
  const params = useLocalSearchParams<{ id?: string }>();
  const [language, setLanguage] = useState<"fil" | "en">("fil");
  const alertId = params.id ?? "00000000-0000-0000-0000-000000000000";
  const alertQuery = useQuery(
    trpc.alerts.getById.queryOptions({
      id: alertId,
    }),
  );

  const alert = alertQuery.data;
  const severity = alert ? getSeverityMeta(alert.severity) : null;
  const title = useMemo(() => {
    if (!alert) {
      return "";
    }

    return language === "fil" ? alert.title_filipino || alert.title : alert.title;
  }, [alert, language]);
  const body = useMemo(() => {
    if (!alert) {
      return "";
    }

    return language === "fil" ? alert.body_filipino || alert.body : alert.body;
  }, [alert, language]);
  const actions = useMemo(() => {
    if (!alert) {
      return "";
    }

    return language === "fil"
      ? alert.recommended_actions_filipino || alert.recommended_actions || ""
      : alert.recommended_actions || alert.recommended_actions_filipino || "";
  }, [alert, language]);

  if (!alert) {
    return (
      <View className="flex-1 px-6 py-6">
        <EmptyState
          title="Alert not found"
          description="The alert may have expired or is no longer available."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 gap-5 px-6 py-6">
      <Pressable
        onPress={() => {
          void haptics.light();
          router.back();
        }}
      >
        <Text className="text-sm font-medium text-blue-700">Bumalik</Text>
      </Pressable>

      <View className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="rounded-[22px] bg-slate-950 p-4">
            <Ionicons color="#FFFFFF" name={getHazardIconName(alert.hazard_type)} size={24} />
          </View>
          <View className="gap-1">
            <Text className="text-sm font-semibold uppercase tracking-[2px] text-slate-500">
              {alert.source.toUpperCase()}
            </Text>
            <View className={`self-start rounded-full px-3 py-1 ${severity?.className.split(" ")[0]}`}>
              <Text className={`text-xs font-semibold ${severity?.className.split(" ")[1]}`}>
                {severity?.label}
              </Text>
            </View>
          </View>
        </View>
        <Text className="text-3xl font-semibold text-slate-950">{title}</Text>
        <Text className="text-sm text-slate-500">{formatRelativeTime(alert.issued_at)}</Text>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          className={`flex-1 rounded-2xl px-4 py-3 ${language === "fil" ? "bg-blue-600" : "bg-white"}`}
          onPress={() => setLanguage("fil")}
        >
          <Text className={`text-center font-semibold ${language === "fil" ? "text-white" : "text-slate-800"}`}>
            Filipino
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 rounded-2xl px-4 py-3 ${language === "en" ? "bg-blue-600" : "bg-white"}`}
          onPress={() => setLanguage("en")}
        >
          <Text className={`text-center font-semibold ${language === "en" ? "text-white" : "text-slate-800"}`}>
            English
          </Text>
        </Pressable>
      </View>

      <SectionCard title="Alert details">
        <Text className="text-base leading-7 text-slate-700">{body}</Text>
      </SectionCard>

      {actions ? (
        <SectionCard title="Recommended actions">
          <Text className="text-base leading-7 text-slate-700">{actions}</Text>
        </SectionCard>
      ) : null}

      <View className="rounded-[28px] bg-slate-950 px-5 py-5">
        <Text className="text-sm font-semibold uppercase tracking-[2px] text-slate-300">
          Signal level
        </Text>
        <Text className="mt-2 text-2xl font-semibold text-white">
          {alert.signal_level || "No signal level"}
        </Text>
      </View>

      <Pressable
        className="rounded-2xl bg-[#1A56C4] px-4 py-4"
        onPress={() =>
          void Share.share({
            message: `${title}\n\n${body}`,
          })
        }
      >
        <Text className="text-center text-base font-semibold text-white">Share</Text>
      </Pressable>
    </View>
  );
}
