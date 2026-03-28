import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
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

  const manualMutation = useMutation(trpc.checkIns.manual.mutationOptions());
  const qrMutation = useMutation(trpc.checkIns.byQr.mutationOptions());
  const proxyMutation = useMutation(trpc.checkIns.proxy.mutationOptions());

  async function submitManualCheckIn() {
    if (!selectedCenterId) {
      setFeedback("Choose an evacuation center first.");
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
      setFeedback("Manual check-in queued offline. It will sync automatically.");
      return;
    }

    try {
      await manualMutation.mutateAsync(payload);
      setFeedback("Manual check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.manual", payload));
        setFeedback("Connection dropped. Your manual check-in was queued.");
        return;
      }

      setFeedback(getErrorMessage(error, "Unable to submit the check-in."));
    }
  }

  async function submitQrCheckIn() {
    if (!qrToken.trim()) {
      setFeedback("Enter or paste the QR token from the evacuation center.");
      return;
    }

    const payload = {
      qrToken: qrToken.trim(),
      householdId: householdQuery.data?.id ?? undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);

    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.qr", payload));
      setFeedback("QR check-in queued offline and ready to sync later.");
      return;
    }

    try {
      await qrMutation.mutateAsync(payload);
      setFeedback("QR check-in submitted.");
      setQrToken("");
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
      setFeedback("Choose a center and a household for proxy check-in.");
      return;
    }

    const payload = {
      centerId: selectedCenterId,
      householdId: selectedProxyHouseholdId,
      memberIds: [],
      notes: notes.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);

    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.proxy", payload));
      setFeedback("Proxy check-in queued offline.");
      return;
    }

    try {
      await proxyMutation.mutateAsync(payload);
      setFeedback("Proxy check-in submitted.");
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.proxy", payload));
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
    setQrToken,
    proxySearch,
    setProxySearch,
    selectedProxyHouseholdId,
    setSelectedProxyHouseholdId,
    notes,
    setNotes,
    feedback,
    centers: centersQuery.data ?? [],
    proxyHouseholds: proxySearchQuery.data ?? [],
    manualMutation,
    qrMutation,
    proxyMutation,
    submitManualCheckIn,
    submitQrCheckIn,
    submitProxyCheckIn,
  };
}
