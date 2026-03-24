import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";

import { AlertBanner } from "@/components/ui/AlertBanner";
import { AiReportPanel } from "@/components/features/dashboard/AiReportPanel";
import { HouseholdList } from "@/components/features/dashboard/HouseholdList";
import { LiveStatCards } from "@/components/features/dashboard/LiveStatCards";
import { PriorityQueue } from "@/components/features/dashboard/PriorityQueue";
import { useActiveAlerts } from "@/hooks/useActiveAlerts";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useHouseholdList } from "@/hooks/useHouseholdList";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/providers/AuthProvider";

export function OfficialDashboard() {
  const { profile } = useAuth();
  const barangayId = profile?.barangay_id ?? "";
  const summaryQuery = useDashboardSummary(barangayId);
  const householdsQuery = useHouseholdList(barangayId);
  const alertsQuery = useActiveAlerts(barangayId);

  const handleRefresh = useCallback(() => {
    void summaryQuery.refetch();
    void householdsQuery.refetch();
    void alertsQuery.refetch();
  }, [alertsQuery, householdsQuery, summaryQuery]);

  useRealtimeSubscription(
    "official-dashboard-households",
    "households",
    barangayId ? `barangay_id=eq.${barangayId}` : "barangay_id=is.null",
    handleRefresh,
  );
  useRealtimeSubscription(
    "official-dashboard-pings",
    "status_pings",
    barangayId ? `barangay_id=eq.${barangayId}` : "barangay_id=is.null",
    handleRefresh,
  );

  return (
    <ScrollView className="flex-1">
      <View className="gap-5 px-6 py-6">
        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-blue-700">
            Official dashboard
          </Text>
          <Text className="text-4xl font-semibold text-slate-950">Handa ang barangay</Text>
          <Text className="text-base leading-7 text-slate-600">
            Live counts for check-ins, safe reports, and households that still need attention.
          </Text>
        </View>

        <AlertBanner alert={alertsQuery.data?.[0] ?? null} />
        <LiveStatCards
          checkedIn={summaryQuery.data?.checked_in_count ?? 0}
          safe={summaryQuery.data?.safe_count ?? 0}
          needHelp={summaryQuery.data?.need_help_count ?? 0}
          unaccounted={summaryQuery.data?.unaccounted_count ?? 0}
          isLoading={summaryQuery.isLoading}
        />
        <PriorityQueue barangayId={barangayId} />
        <HouseholdList
          households={householdsQuery.data?.items ?? []}
          isLoading={householdsQuery.isLoading}
          scrollEnabled={false}
        />
        <AiReportPanel barangayId={barangayId} />
      </View>
    </ScrollView>
  );
}
