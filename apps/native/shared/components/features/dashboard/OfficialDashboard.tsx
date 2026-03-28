import { useMutation, useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard, StatCard } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";
import { formatRelativeTime } from "@/shared/utils/date";

export function OfficialDashboard() {
  const { profile, signOut } = useAuth();

  const summaryQuery = useQuery(
    trpc.dashboard.summary.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const unresolvedQuery = useQuery(
    trpc.statusPings.listUnresolved.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const unaccountedQuery = useQuery(
    trpc.households.getUnaccounted.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const resolveMutation = useMutation(
    trpc.statusPings.resolve.mutationOptions({
      onSuccess: () => {
        unresolvedQuery.refetch();
        summaryQuery.refetch();
      },
    }),
  );

  const toggleCenterMutation = useMutation(
    trpc.evacuationCenters.toggleOpen.mutationOptions({
      onSuccess: () => {
        centersQuery.refetch();
      },
    }),
  );

  const summary = summaryQuery.data;

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.1 Live dashboard"
        title="Barangay command view"
        description="Track safe, need-help, checked-in, and unaccounted households from one screen."
        action={<AppButton label="Sign out" onPress={() => void signOut()} variant="ghost" />}
      />

      <SectionCard title="Live KPIs" subtitle="Counts refresh every 60 seconds to stay resilient even on weak connections.">
        <View className="flex-row flex-wrap gap-3">
          <StatCard label="Safe" value={summary?.safe_count ?? 0} tone="success" />
          <StatCard label="Need help" value={summary?.need_help_count ?? 0} tone="danger" />
          <StatCard label="Checked in" value={summary?.checked_in_count ?? 0} tone="info" />
          <StatCard label="Unaccounted" value={summary?.unaccounted_count ?? 0} tone="warning" />
        </View>
      </SectionCard>

      <SectionCard title="Priority queue" subtitle="Unresolved need-help pings are surfaced first for quick action.">
        {unresolvedQuery.data?.length ? (
          unresolvedQuery.data.map((ping) => (
            <View key={ping.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">
                    {ping.status === "need_help" ? "Kailangan ng Tulong" : "Ligtas Ako"}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {ping.message || "No additional resident note"}
                  </Text>
                  <Text className="mt-2 text-xs uppercase tracking-[1.2px] text-slate-400">
                    {formatRelativeTime(ping.pinged_at)}
                  </Text>
                </View>
                <Pill label={ping.channel.toUpperCase()} tone={ping.status === "need_help" ? "danger" : "success"} />
              </View>
              <View className="mt-4">
                <AppButton
                  label="Mark resolved"
                  onPress={() => void resolveMutation.mutateAsync({ pingId: ping.id })}
                  loading={resolveMutation.isPending && resolveMutation.variables?.pingId === ping.id}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No unresolved pings"
            description="Need-help pings will appear here as soon as residents or SMS-only households report them."
          />
        )}
      </SectionCard>

      <SectionCard title="Unaccounted households" subtitle="Use this list to prioritize outreach and welfare dispatch.">
        {unaccountedQuery.data?.length ? (
          unaccountedQuery.data.slice(0, 5).map((household) => (
            <View key={household.id} className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
              <Text className="mt-1 text-sm text-slate-500">
                {household.purok} • {household.address}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState
            title="Everyone is accounted for"
            description="Unaccounted households will show here when dashboard logic detects missing check-ins or pings."
          />
        )}
      </SectionCard>

      <SectionCard title="Evacuation centers" subtitle="Open or close center availability directly from the dashboard.">
        {centersQuery.data?.length ? (
          centersQuery.data.map((center) => (
            <View key={center.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">{center.name}</Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {center.current_occupancy}/{center.capacity} occupants
                  </Text>
                </View>
                <Pill label={center.is_open ? "Open" : "Closed"} tone={center.is_open ? "success" : "warning"} />
              </View>
              <View className="mt-4">
                <AppButton
                  label={center.is_open ? "Close center" : "Open center"}
                  onPress={() => void toggleCenterMutation.mutateAsync({ centerId: center.id, isOpen: !center.is_open })}
                  variant={center.is_open ? "secondary" : "primary"}
                  loading={toggleCenterMutation.isPending && toggleCenterMutation.variables?.centerId === center.id}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No centers configured"
            description="Center controls will appear here after evacuation centers are created for the barangay."
          />
        )}
      </SectionCard>
    </View>
  );
}
