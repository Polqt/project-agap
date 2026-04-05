import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";

import { createQueuedAction } from "@/services/offlineQueueActions";
import {
  getOfflineHousehold,
  getOfflineRegistryHousehold,
  getOfflineScope,
  listOfflineEvacuationCenters,
  searchOfflineRegistryHouseholds,
  syncOfflineDataForProfile,
} from "@/services/offlineData";
import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

import type { CheckInMode } from "../types";

export type UseCheckInFlowOptions = {
  /** Shared tablet walk-in flow: QR + manual only, larger UI in CheckInFlow. */
  kioskMode?: boolean;
};

export function useCheckInFlow(options?: UseCheckInFlowOptions) {
  const kioskMode = options?.kioskMode ?? false;
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { isOnline, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const offlineScope = getOfflineScope(profile);

  const [mode, setMode] = useState<CheckInMode>("manual");
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [proxySearch, setProxySearch] = useState("");
  const [selectedProxyHouseholdId, setSelectedProxyHouseholdId] = useState<string | null>(null);
  const [selectedProxyMemberIds, setSelectedProxyMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const householdQuery = useQuery({
    queryKey: ["offline", "checkin-household", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineHousehold(offlineScope!.scopeId),
  });

  const centersQuery = useQuery({
    queryKey: ["offline", "checkin-centers", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineEvacuationCenters(offlineScope!.scopeId),
  });

  const proxySearchQuery = useQuery({
    queryKey: ["offline", "proxy-search", offlineScope?.scopeId, proxySearch, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId && proxySearch.trim().length >= 2),
    queryFn: async () => searchOfflineRegistryHouseholds(offlineScope!.scopeId, proxySearch),
  });

  const selectedProxyHouseholdQuery = useQuery({
    queryKey: [
      "offline",
      "proxy-household",
      offlineScope?.scopeId,
      selectedProxyHouseholdId,
      offlineGeneration,
    ],
    enabled: Boolean(offlineScope?.scopeId && selectedProxyHouseholdId),
    queryFn: async () => getOfflineRegistryHousehold(offlineScope!.scopeId, selectedProxyHouseholdId!),
  });

  const manualMutation = useMutation(trpc.checkIns.manual.mutationOptions());
  const qrMutation = useMutation(trpc.checkIns.byQr.mutationOptions());
  const proxyMutation = useMutation(trpc.checkIns.proxy.mutationOptions());
  const markLocatedMutation = useMutation(trpc.households.markLocated.mutationOptions());

  const centers = (centersQuery.data ?? []).filter((center) => center.is_open);

  useEffect(() => {
    if (!centers.length) {
      if (selectedCenterId) {
        setSelectedCenterId(null);
      }

      return;
    }

    const hasSelectedCenter = selectedCenterId
      ? centers.some((center) => center.id === selectedCenterId)
      : false;

    if (!hasSelectedCenter) {
      setSelectedCenterId(centers[0]?.id ?? null);
    }
  }, [centers, selectedCenterId]);

  useEffect(() => {
    setSelectedProxyMemberIds([]);
  }, [selectedProxyHouseholdId]);

  useEffect(() => {
    if (kioskMode && mode === "proxy") {
      setMode("manual");
    }
  }, [kioskMode, mode]);

  function handleProxyHouseholdSelect(householdId: string) {
    setSelectedProxyHouseholdId(householdId);
  }

  function toggleProxyMember(memberId: string) {
    setSelectedProxyMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((currentMemberId) => currentMemberId !== memberId)
        : [...current, memberId],
    );
  }

  function handleQrFallback() {
    setMode("manual");
    setFeedback("Camera access is unavailable. Continue with manual center selection.");
  }

  async function submitManualCheckIn() {
    if (!selectedCenterId) {
      setFeedback("Choose an open evacuation center first.");
      return;
    }

    const payload = {
      centerId: selectedCenterId,
      householdId: householdQuery.data?.id ?? undefined,
      notes: notes.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);

    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.manual", payload, offlineScope));
      setNotes("");
      setFeedback("Manual check-in queued offline. It will sync automatically.");
      return;
    }

    try {
      await manualMutation.mutateAsync(payload);
      if (profile) {
        await syncOfflineDataForProfile(profile);
        bumpOfflineDataGeneration();
      }
      setNotes("");
      setFeedback("Manual check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.manual", payload, offlineScope));
        setNotes("");
        setFeedback("Connection dropped. Your manual check-in was queued.");
        return;
      }

      setFeedback(getErrorMessage(error, "Unable to submit the check-in."));
    }
  }

  async function submitQrCheckIn(nextQrToken?: string) {
    const resolvedQrToken = (nextQrToken ?? qrToken).trim();

    if (!resolvedQrToken) {
      setFeedback("Scan the center QR code to continue.");
      return;
    }

    setFeedback(null);
    setQrToken(resolvedQrToken);

    // Family Reunification QR — payload format: AGAP:HH:{householdId}
    if (resolvedQrToken.startsWith("AGAP:HH:")) {
      const householdId = resolvedQrToken.slice("AGAP:HH:".length);
      try {
        const result = await markLocatedMutation.mutateAsync({ householdId });
        setQrToken("");
        setFeedback(
          result.smsNotified
            ? `Family located! SMS notification sent to ${result.household.household_head}.`
            : `Family located! ${result.household.household_head} is now marked as checked in.`,
        );
      } catch (error) {
        setFeedback(getErrorMessage(error, "Unable to mark household as located."));
      }
      return;
    }

    const payload = {
      qrToken: resolvedQrToken,
      householdId: householdQuery.data?.id ?? undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.qr", payload, offlineScope));
      setFeedback("QR check-in queued offline and ready to sync later.");
      return;
    }

    try {
      await qrMutation.mutateAsync(payload);
      if (profile) {
        await syncOfflineDataForProfile(profile);
        bumpOfflineDataGeneration();
      }
      setQrToken("");
      setFeedback("QR check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.qr", payload, offlineScope));
        setFeedback("Connection dropped. Your QR check-in was queued.");
        return;
      }

      setFeedback(getErrorMessage(error, "Unable to submit the QR check-in."));
    }
  }

  async function submitProxyCheckIn() {
    if (!selectedCenterId || !selectedProxyHouseholdId) {
      setFeedback("Choose an open center and a household for proxy check-in.");
      return;
    }

    const payload = {
      centerId: selectedCenterId,
      householdId: selectedProxyHouseholdId,
      memberIds: selectedProxyMemberIds,
      notes: notes.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);

    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.proxy", payload, offlineScope));
      setNotes("");
      setSelectedProxyMemberIds([]);
      setFeedback("Proxy check-in queued offline.");
      return;
    }

    try {
      await proxyMutation.mutateAsync(payload);
      if (profile) {
        await syncOfflineDataForProfile(profile);
        bumpOfflineDataGeneration();
      }
      setNotes("");
      setProxySearch("");
      setSelectedProxyHouseholdId(null);
      setSelectedProxyMemberIds([]);
      setFeedback("Proxy check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.proxy", payload, offlineScope));
        setNotes("");
        setSelectedProxyMemberIds([]);
        setFeedback("Connection dropped. Your proxy check-in was queued.");
        return;
      }

      setFeedback(getErrorMessage(error, "Unable to submit the proxy check-in."));
    }
  }

  return {
    mode,
    setMode,
    selectedCenterId,
    setSelectedCenterId,
    qrToken,
    proxySearch,
    setProxySearch,
    selectedProxyHouseholdId,
    handleProxyHouseholdSelect,
    selectedProxyMemberIds,
    toggleProxyMember,
    notes,
    setNotes,
    feedback,
    setFeedback,
    centers,
    hasOpenCenters: centers.length > 0,
    household: householdQuery.data ?? null,
    proxyHouseholds: proxySearchQuery.data ?? [],
    isSearchingProxyHouseholds: proxySearchQuery.isFetching,
    selectedProxyHousehold: selectedProxyHouseholdQuery.data ?? null,
    proxyMembers: selectedProxyHouseholdQuery.data?.household_members ?? [],
    isLoadingProxyHousehold: selectedProxyHouseholdQuery.isFetching,
    manualMutation,
    qrMutation,
    proxyMutation,
    submitManualCheckIn,
    submitQrCheckIn,
    submitProxyCheckIn,
    handleQrFallback,
    kioskMode,
  };
}
