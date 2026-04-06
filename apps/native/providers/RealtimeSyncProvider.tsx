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
import { appShellStore } from "@/stores/app-shell-store";

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
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !profile?.barangay_id || !profile?.role || !profile?.id) {
      return;
    }

    const barangayId = profile.barangay_id;
    const role = profile.role;
    const profileId = profile.id;
    const offlineScope = getOfflineScope(profile);

    function clearReconnectTimer() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function scheduleReconnect(delayMs: number) {
      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        const syncStatus = appShellStore.state.syncStatus;
        if (syncStatus === "offline") {
          // Still offline — try again later, the store listener will also fire on recovery
          scheduleReconnect(10_000);
          return;
        }
        const stale = channelRef.current;
        channelRef.current = null;
        void (stale ? supabase.removeChannel(stale) : Promise.resolve()).then(() => subscribe());
      }, delayMs);
    }

    function queueOfflineDatasets(
      datasets: Array<Parameters<typeof syncOfflineDatasets>[1][number]>,
    ) {
      if (!offlineScope) {
        return;
      }

      datasets.forEach((dataset) => pendingOfflineSyncRef.current.add(dataset));

      if (offlineSyncTimerRef.current) {
        clearTimeout(offlineSyncTimerRef.current);
      }

      offlineSyncTimerRef.current = setTimeout(() => {
        const nextDatasets = Array.from(
          pendingOfflineSyncRef.current,
        ) as Parameters<typeof syncOfflineDatasets>[1];
        pendingOfflineSyncRef.current.clear();
        void syncOfflineDatasets(offlineScope, nextDatasets)
          .then(() => bumpOfflineDataGeneration())
          .catch(() => {});
      }, 800);
    }

    function subscribe() {
      // Don't open a WebSocket when there's no usable path
      if (appShellStore.state.syncStatus === "offline") {
        return;
      }

      const channel = supabase.channel(`agap-realtime:${role}:${barangayId}`);
      channelRef.current = channel;

      REALTIME_TABLES.forEach((table) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
            if (!matchesRealtimeBarangayScope(table, barangayId, payload)) {
              return;
            }

            const tableRootByRealtimeTable: Partial<
              Record<(typeof REALTIME_TABLES)[number], string>
            > = {
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
              Record<
                (typeof REALTIME_TABLES)[number],
                Array<Parameters<typeof syncOfflineDatasets>[1][number]>
              >
            > = {
              alerts: ["alerts", "barangay"],
              broadcasts: ["broadcasts", "smsLogs"],
              check_ins: ["household", "registryHouseholds", "evacuationCenters"],
              evacuation_centers: ["evacuationCenters", "centerSupplies"],
              households: [
                "household",
                "registryHouseholds",
                "dashboardSummary",
                "unaccountedHouseholds",
                "welfareAssignments",
                "welfareDispatch",
              ],
              needs_reports: ["needsReports", "needsSummary", "dashboardSummary"],
              status_pings: ["latestStatusPing", "unresolvedPings", "dashboardSummary"],
            };
            const offlineDatasets = datasetsByRealtimeTable[table];
            if (offlineDatasets) {
              queueOfflineDatasets(offlineDatasets);
            }

            if (
              role === "resident" &&
              table === "alerts" &&
              shouldNotifyResidentAlert(payload)
            ) {
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

            if (
              role === "resident" &&
              table === "broadcasts" &&
              shouldNotifyResidentBroadcast(payload)
            ) {
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
              role === "resident" &&
              table === "status_pings" &&
              shouldNotifyResidentStatusPing(payload, profileId)
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

      void channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // On weak connections give it more breathing room before retrying
          const isWeak = appShellStore.state.syncStatus === "degraded";
          channelRef.current = null;
          scheduleReconnect(isWeak ? 12_000 : 5_000);
        }
      });
    }

    subscribe();

    // Reconnect when the app recovers from offline while the channel is gone
    const storeSubscription = appShellStore.subscribe(() => {
      const syncStatus = appShellStore.state.syncStatus;
      if ((syncStatus === "online" || syncStatus === "degraded") && channelRef.current === null) {
        clearReconnectTimer();
        subscribe();
      }
    });

    return () => {
      storeSubscription.unsubscribe();
      clearReconnectTimer();

      if (offlineSyncTimerRef.current) {
        clearTimeout(offlineSyncTimerRef.current);
        offlineSyncTimerRef.current = null;
      }

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAuthenticated, profile?.barangay_id, profile?.role]);

  return children;
}
