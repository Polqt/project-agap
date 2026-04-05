import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useCallback, useMemo, useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import {
  getOfflineScope,
  listOfflineWelfareAssignments,
  removeOfflineWelfareAssignment,
  syncOfflineDataForProfile,
} from "@/services/offlineData";
import { trpc } from "@/services/trpc";
import { getErrorMessage } from "@/shared/utils/errors";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

type WelfareOutcome = "safe" | "need_help" | "not_home" | "dispatch_again";

export function useWelfareCheck() {
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, queueAction } = useOfflineQueue();
  const [hiddenHouseholdIds, setHiddenHouseholdIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const offlineScope = getOfflineScope(profile);

  const assignmentsQuery = useQuery({
    queryKey: ["offline", "welfare-assignments", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineWelfareAssignments(offlineScope!.scopeId),
  });

  const recordMutation = useMutation(
    trpc.households.recordWelfareOutcome.mutationOptions({
      onSuccess: async (_, variables) => {
        if (offlineScope) {
          await removeOfflineWelfareAssignment(offlineScope.scopeId, variables.householdId);
        }
        if (profile) {
          await syncOfflineDataForProfile(profile);
        }
        bumpOfflineDataGeneration();
        setFeedback("Welfare outcome recorded.");
      },
      onError: async (error) => {
        if (profile) {
          await syncOfflineDataForProfile(profile);
          bumpOfflineDataGeneration();
        }
        setFeedback(getErrorMessage(error, "Unable to record welfare outcome."));
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
      const household = assignmentsQuery.data?.find((entry) => entry.id === householdId);

      if (!isOnline) {
        await queueAction(
          createQueuedAction("welfare.recordOutcome", {
            householdId,
            outcome,
            expectedUpdatedAt: household?.updated_at ?? null,
          }, offlineScope),
        );
        setHiddenHouseholdIds((prev) => [...prev, householdId]);
        setFeedback("Outcome queued offline.");
        return;
      }

      await recordMutation.mutateAsync({
        householdId,
        outcome,
        expectedUpdatedAt: household?.updated_at ?? null,
      });
    },
    [assignmentsQuery.data, isOnline, queueAction, recordMutation],
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
    feedback,
  };
}
