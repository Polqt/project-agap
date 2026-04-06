import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef, type PropsWithChildren } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { getOfflineScope, syncOfflineDatasets } from "@/services/offlineData";
import { scheduleAlertNotificationAsync } from "@/services/notifications";
import {
  REALTIME_TABLES,
  getRealtimeAlertNotification,
  getRealtimeBroadcastNotification,
  getRealtimeStatusPingNotification,
  matchesRealtimeBarangayScope,
  shouldNotifyResidentAlert,
  shouldNotifyResidentBroadcast,
  shouldNotifyResidentStatusPing,
} from "@/services/realtime";
import { supabase } from "@/services/supabase";
import { queryClient } from "@/services/trpc";
import { bumpOfflineDataGeneration } from "@/stores/offline-data-store";

type RealtimeRow = {
  id?: string;
  barangay_id?: string | null;
  resident_id?: string | null;
  status?: string | null;
  channel?: string | null;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  broadcast_type?: string | null;
  is_active?: boolean | null;
};

export function RealtimeSyncProvider({ children }: PropsWithChildren) {
  const { profile, isAuthenticated } = useAuth();
  const lastAlertIdRef = useRef<string | null>(null);
  const lastBroadcastIdRef = useRef<string | null>(null);
  const lastStatusPingIdRef = useRef<string | null>(null);
  const pendingOfflineSyncRef = useRef<Set<string>>(new Set());
  const offlineSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !profile?.barangay_id) {
      return;
    }

    const offlineScope = getOfflineScope(profile);
    const channel = supabase.channel(`agap-realtime:${profile.role}:${profile.barangay_id}`);

    function queueOfflineDatasets(datasets: Array<Parameters<typeof syncOfflineDatasets>[1][number]>) {
      if (!offlineScope) {
        return;
      }

      datasets.forEach((dataset) => pendingOfflineSyncRef.current.add(dataset));

      if (offlineSyncTimerRef.current) {
        clearTimeout(offlineSyncTimerRef.current);
      }

      offlineSyncTimerRef.current = setTimeout(() => {
        const nextDatasets = Array.from(pendingOfflineSyncRef.current) as Parameters<typeof syncOfflineDatasets>[1];
        pendingOfflineSyncRef.current.clear();
        void syncOfflineDatasets(offlineScope, nextDatasets)
          .then(() => bumpOfflineDataGeneration())
          .catch(() => {});
      }, 800);
    }

    REALTIME_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
          if (!matchesRealtimeBarangayScope(table, profile.barangay_id!, payload)) {
            return;
          }

          const tableRootByRealtimeTable: Partial<Record<(typeof REALTIME_TABLES)[number], string>> = {
            alerts: "alerts",
            broadcasts: "broadcasts",
            check_ins: "checkIns",
            evacuation_centers: "evacuationCenters",
            households: "households",
            needs_reports: "needsReports",
            status_pings: "statusPings",
          };
          const tableRoot = tableRootByRealtimeTable[table];

          if (tableRoot) {
            void queryClient.invalidateQueries({
              predicate: (query) => {
                const first = query.queryKey[0];
                if (typeof first === "string") {
                  return first === tableRoot;
                }

                return Array.isArray(first) && first[0] === tableRoot;
              },
            });
          }

          const datasetsByRealtimeTable: Partial<
            Record<(typeof REALTIME_TABLES)[number], Array<Parameters<typeof syncOfflineDatasets>[1][number]>>
          > = {
            alerts: ["alerts", "barangay"],
            broadcasts: ["broadcasts", "smsLogs"],
            check_ins: ["household", "registryHouseholds", "evacuationCenters"],
            evacuation_centers: ["evacuationCenters", "centerSupplies"],
            households: ["household", "registryHouseholds", "dashboardSummary", "unaccountedHouseholds", "welfareAssignments", "welfareDispatch"],
            needs_reports: ["needsReports", "needsSummary", "dashboardSummary"],
            status_pings: ["latestStatusPing", "unresolvedPings", "dashboardSummary"],
          };
          const offlineDatasets = datasetsByRealtimeTable[table];
          if (offlineDatasets) {
            queueOfflineDatasets(offlineDatasets);
          }

          if (profile.role === "resident" && table === "alerts" && shouldNotifyResidentAlert(payload)) {
            const nextAlertId =
              payload.new && "id" in payload.new && typeof payload.new.id === "string"
                ? payload.new.id
                : null;

            if (nextAlertId && nextAlertId === lastAlertIdRef.current) {
              return;
            }

            lastAlertIdRef.current = nextAlertId;

            void scheduleAlertNotificationAsync(getRealtimeAlertNotification(payload));
          }

          if (profile.role === "resident" && table === "broadcasts" && shouldNotifyResidentBroadcast(payload)) {
            const nextBroadcastId =
              payload.new && "id" in payload.new && typeof payload.new.id === "string"
                ? payload.new.id
                : null;

            if (nextBroadcastId && nextBroadcastId === lastBroadcastIdRef.current) {
              return;
            }

            lastBroadcastIdRef.current = nextBroadcastId;

            void scheduleAlertNotificationAsync(getRealtimeBroadcastNotification(payload));
          }

          if (
            profile.role === "resident" &&
            table === "status_pings" &&
            shouldNotifyResidentStatusPing(payload, profile.id)
          ) {
            const nextStatusPingId =
              payload.new && "id" in payload.new && typeof payload.new.id === "string"
                ? payload.new.id
                : null;

            if (nextStatusPingId && nextStatusPingId === lastStatusPingIdRef.current) {
              return;
            }

            lastStatusPingIdRef.current = nextStatusPingId;

            void scheduleAlertNotificationAsync(getRealtimeStatusPingNotification(payload));
          }
        },
      );
    });

    void channel.subscribe();

    return () => {
      if (offlineSyncTimerRef.current) {
        clearTimeout(offlineSyncTimerRef.current);
        offlineSyncTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, profile?.barangay_id, profile?.role]);

  return children;
}
