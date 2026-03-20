import type { SmsFollowupItem, SmsLog } from "@project-agap/api/supabase";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Text, View } from "react-native";

import { VulnerabilityChips } from "@/components/ui/VulnerabilityChips";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/services/supabase";
import { trpc } from "@/utils/trpc";

export function DeliveryTracker({ broadcastId }: { broadcastId: string | null }) {
  const { profile } = useAuth();
  const smsLogsQuery = useQuery({
    queryKey: ["smsLogs", broadcastId],
    enabled: Boolean(broadcastId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_logs")
        .select(
          "id, barangay_id, household_id, broadcast_id, direction, phone_number, message, delivery_status, keyword_reply, gateway_message_id, error_message, sent_at, delivered_at, replied_at, created_at",
        )
        .eq("broadcast_id", broadcastId!)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as SmsLog[];
    },
  });
  const followupQuery = useQuery(
    trpc.dashboard.smsFollowup.queryOptions(
      {
        barangayId: profile?.barangay_id ?? undefined,
        broadcastId: broadcastId ?? "00000000-0000-0000-0000-000000000000",
      },
      { enabled: Boolean(profile?.barangay_id && broadcastId) },
    ),
  );

  useRealtimeSubscription(
    "broadcast-delivery",
    "sms_logs",
    broadcastId ? `broadcast_id=eq.${broadcastId}` : "broadcast_id=is.null",
    () => {
      void smsLogsQuery.refetch();
      void followupQuery.refetch();
    },
  );

  const stats = useMemo(() => {
    const rows = smsLogsQuery.data ?? [];
    return {
      sent: rows.filter((row) => ["sent", "delivered", "replied"].includes(row.delivery_status)).length,
      delivered: rows.filter((row) => ["delivered", "replied"].includes(row.delivery_status)).length,
      replied: rows.filter((row) => row.delivery_status === "replied").length,
    };
  }, [smsLogsQuery.data]);

  if (!broadcastId) {
    return null;
  }

  return (
    <View className="gap-4 rounded-[28px] bg-white px-5 py-5">
      <Text className="text-xl font-semibold text-slate-950">Delivery Tracker</Text>
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-slate-100 px-4 py-4">
          <Text className="text-sm text-slate-500">Sent</Text>
          <Text className="mt-2 text-2xl font-semibold text-slate-950">{stats.sent}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-slate-100 px-4 py-4">
          <Text className="text-sm text-slate-500">Delivered</Text>
          <Text className="mt-2 text-2xl font-semibold text-slate-950">{stats.delivered}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-slate-100 px-4 py-4">
          <Text className="text-sm text-slate-500">Replied</Text>
          <Text className="mt-2 text-2xl font-semibold text-slate-950">{stats.replied}</Text>
        </View>
      </View>
      <View className="gap-3">
        <Text className="text-lg font-semibold text-slate-950">Follow-up needed</Text>
        {(followupQuery.data ?? []).length > 0 ? (
          (followupQuery.data ?? []).map((item: SmsFollowupItem) => (
            <View key={item.household_id} className="rounded-2xl bg-slate-50 px-4 py-4">
              <Text className="text-base font-semibold text-slate-950">{item.household_head}</Text>
              <Text className="mt-1 text-sm text-slate-600">{item.phone_number}</Text>
              <Text className="mt-1 text-sm text-slate-500">
                {Math.round(item.minutes_since_sent)} min since sent
              </Text>
              <View className="mt-3">
                <VulnerabilityChips flags={item.vulnerability_flags} />
              </View>
            </View>
          ))
        ) : (
          <Text className="text-sm text-slate-500">No follow-up needed right now.</Text>
        )}
      </View>
    </View>
  );
}
