import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef, type PropsWithChildren } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { scheduleAlertNotificationAsync } from "@/services/notifications";
import {
  REALTIME_TABLES,
  getRealtimeAlertNotification,
  getRealtimeBroadcastNotification,
  matchesRealtimeBarangayScope,
  shouldNotifyResidentAlert,
  shouldNotifyResidentBroadcast,
} from "@/services/realtime";
import { supabase } from "@/services/supabase";
import { queryClient } from "@/services/trpc";

type RealtimeRow = {
  id?: string;
  barangay_id?: string | null;
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

  useEffect(() => {
    if (!isAuthenticated || !profile?.barangay_id) {
      return;
    }

    const channel = supabase.channel(`agap-realtime:${profile.role}:${profile.barangay_id}`);

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
        },
      );
    });

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, profile?.barangay_id, profile?.role]);

  return children;
}
