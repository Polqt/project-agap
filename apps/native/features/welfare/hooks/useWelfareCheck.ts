import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";

type WelfareOutcome = "safe" | "need_help" | "not_home" | "dispatch_again";

export function useWelfareCheck() {
  const { profile } = useAuth();
  const { isOnline, queueAction } = useOfflineQueue();
  const [hiddenHouseholdIds, setHiddenHouseholdIds] = useState<string[]>([]);

  const assignmentsQuery = useQuery(
    trpc.households.listMyWelfareAssignments.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      { enabled: Boolean(profile?.barangay_id), refetchInterval: 60_000 },
    ),
  );

  const recordMutation = useMutation(
    trpc.households.recordWelfareOutcome.mutationOptions({
      onSuccess: () => {
        void assignmentsQuery.refetch();
      },
    }),
  );

  const households = useMemo(() => {
    const list = assignmentsQuery.data ?? [];
    const hidden = new Set(hiddenHouseholdIds);
    return list.filter((h) => !hidden.has(h.id));
  }, [assignmentsQuery.data, hiddenHouseholdIds]);

  const clearHiddenForSynced = useCallback(() => {
    setHiddenHouseholdIds([]);
  }, []);

  const recordOutcome = useCallback(
    async (householdId: string, outcome: WelfareOutcome) => {
      if (!isOnline) {
        await queueAction(
          createQueuedAction("welfare.recordOutcome", {
            householdId,
            outcome,
          }),
        );
        setHiddenHouseholdIds((prev) => [...prev, householdId]);
        return;
      }

      await recordMutation.mutateAsync({ householdId, outcome });
    },
    [isOnline, queueAction, recordMutation],
  );

  return {
    households,
    isLoading: assignmentsQuery.isLoading,
    isRecording: recordMutation.isPending,
    recordingHouseholdId: recordMutation.variables?.householdId,
    recordOutcome,
    refetch: assignmentsQuery.refetch,
    clearHiddenForSynced,
    isOnline,
  };
}
