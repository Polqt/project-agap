import type { Alert as AlertRecord } from "@project-agap/api/supabase";

import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/app/empty-state";
import { useActiveAlerts } from "@/hooks/useActiveAlerts";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/providers/AuthProvider";
import { haptics } from "@/services/haptics";
import { formatRelativeTime, getHazardIconName, getSeverityMeta } from "@/utils/format";

const AlertRow = memo(function AlertRow({
  item,
  onPress,
}: {
  item: AlertRecord;
  onPress: (item: AlertRecord) => void;
}) {
  const severity = getSeverityMeta(item.severity);

  return (
    <Pressable
      className="mb-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5"
      onPress={() => onPress(item)}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <View className={`rounded-full px-3 py-1 ${severity.className.split(" ")[0]}`}>
              <Text className={`text-xs font-semibold ${severity.className.split(" ")[1]}`}>
                {severity.label}
              </Text>
            </View>
            {item.signal_level ? (
              <Text className="text-xs font-semibold text-slate-500">{item.signal_level}</Text>
            ) : null}
          </View>
          <Text className="text-lg font-semibold text-slate-950">
            {item.title_filipino || item.title}
          </Text>
          <Text className="text-sm leading-6 text-slate-600" numberOfLines={3}>
            {item.body_filipino || item.body}
          </Text>
        </View>
        <View className="rounded-2xl bg-slate-100 p-3">
          <Ionicons color="#1E293B" name={getHazardIconName(item.hazard_type)} size={20} />
        </View>
      </View>
      <Text className="mt-4 text-xs font-medium text-slate-500">
        {formatRelativeTime(item.issued_at)}
      </Text>
    </Pressable>
  );
});

export function AlertsFeed() {
  const { profile } = useAuth();
  const alertsQuery = useActiveAlerts(profile?.barangay_id);
  const lastAlertIdRef = useRef<string | null>(null);

  usePushNotifications(Boolean(profile?.barangay_id));

  useRealtimeSubscription(
    "resident-alerts",
    "alerts",
    profile?.barangay_id ? `barangay_id=eq.${profile.barangay_id}` : "barangay_id=is.null",
    () => {
      void alertsQuery.refetch().then((result) => {
        const nextAlert = result.data?.[0];
        if (nextAlert && nextAlert.id !== lastAlertIdRef.current) {
          lastAlertIdRef.current = nextAlert.id;
        }
      });
    },
  );

  useEffect(() => {
    if (alertsQuery.data?.[0]) {
      lastAlertIdRef.current = alertsQuery.data[0].id;
    }
  }, [alertsQuery.data]);

  const handleAlertPress = useCallback((item: AlertRecord) => {
    void haptics.light();
    router.push({
      pathname: "/(shared)/alert-detail",
      params: { id: item.id },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AlertRecord }) => <AlertRow item={item} onPress={handleAlertPress} />,
    [handleAlertPress],
  );

  return (
    <View className="flex-1 px-6 py-6">
      <View className="gap-3 pb-5">
        <Text className="text-sm font-semibold uppercase tracking-[3px] text-blue-700">
          Active alerts
        </Text>
        <Text className="text-4xl font-semibold text-slate-950">Latest warnings</Text>
        <Text className="text-base leading-7 text-slate-600">
          Live hazard updates for your barangay, refreshed with Supabase Realtime.
        </Text>
      </View>

      {alertsQuery.data && alertsQuery.data.length > 0 ? (
        <FlashList
          data={alertsQuery.data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="No active alerts"
          description="When PAGASA, PHIVOLCS, or barangay-issued alerts go live, they will appear here."
        />
      )}
    </View>
  );
}
