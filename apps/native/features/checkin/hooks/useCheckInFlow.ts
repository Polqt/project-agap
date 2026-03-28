import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";

import type { CheckInMode } from "../types";

export function useCheckInFlow() {
  const { profile } = useAuth();
  const { isOnline, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));

  const [mode, setMode] = useState<CheckInMode>("manual");
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [proxySearch, setProxySearch] = useState("");
  const [selectedProxyHouseholdId, setSelectedProxyHouseholdId] = useState<string | null>(null);
  const [selectedProxyMemberIds, setSelectedProxyMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const householdQuery = useQuery(
    trpc.households.getMine.queryOptions(undefined, {
      enabled: Boolean(profile?.barangay_id),
    }),
  );

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  const proxySearchQuery = useQuery(
    trpc.households.search.queryOptions(
      {
        barangayId: profile?.barangay_id ?? undefined,
        query: proxySearch,
      },
      {
        enabled: Boolean(profile?.barangay_id && proxySearch.trim().length >= 2),
      },
    ),
  );

  const selectedProxyHouseholdQuery = useQuery(
    trpc.households.getById.queryOptions(
      { id: selectedProxyHouseholdId ?? "" },
      {
        enabled: Boolean(selectedProxyHouseholdId),
      },
    ),
  );

  const manualMutation = useMutation(trpc.checkIns.manual.mutationOptions());
  const qrMutation = useMutation(trpc.checkIns.byQr.mutationOptions());
  const proxyMutation = useMutation(trpc.checkIns.proxy.mutationOptions());

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
      await queueAction(createQueuedAction("check-in.manual", payload));
      setNotes("");
      setFeedback("Manual check-in queued offline. It will sync automatically.");
      return;
    }

    try {
      await manualMutation.mutateAsync(payload);
      setNotes("");
      setFeedback("Manual check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.manual", payload));
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

    const payload = {
      qrToken: resolvedQrToken,
      householdId: householdQuery.data?.id ?? undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);
    setQrToken(resolvedQrToken);

    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.qr", payload));
      setFeedback("QR check-in queued offline and ready to sync later.");
      return;
    }

    try {
      await qrMutation.mutateAsync(payload);
      setQrToken("");
      setFeedback("QR check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.qr", payload));
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
      await queueAction(createQueuedAction("check-in.proxy", payload));
      setNotes("");
      setSelectedProxyMemberIds([]);
      setFeedback("Proxy check-in queued offline.");
      return;
    }

    try {
      await proxyMutation.mutateAsync(payload);
      setNotes("");
      setProxySearch("");
      setSelectedProxyHouseholdId(null);
      setSelectedProxyMemberIds([]);
      setFeedback("Proxy check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.proxy", payload));
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
  };
}
