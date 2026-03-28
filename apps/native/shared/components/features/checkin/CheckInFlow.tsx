import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";

type CheckInMode = "manual" | "qr" | "proxy";

export function CheckInFlow() {
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

  const centers = centersQuery.data ?? [];

  async function handleManualCheckIn() {
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

  async function handleQrCheckIn() {
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

  async function handleProxyCheckIn() {
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

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.3 Check-in"
        title="Evacuation center check-in"
        description="Residents can check in manually or by QR token, and submit proxy check-ins for another household when needed."
      />

      <SectionCard title="Mode" subtitle="Switch between manual, QR, and proxy check-in flows.">
        <View className="flex-row gap-3">
          {(["manual", "qr", "proxy"] as CheckInMode[]).map((entry) => (
            <Pressable
              key={entry}
              onPress={() => setMode(entry)}
              className={`rounded-full px-4 py-3 ${mode === entry ? "bg-blue-700" : "bg-slate-200"}`}
            >
              <Text className={`text-sm font-semibold ${mode === entry ? "text-white" : "text-slate-700"}`}>
                {entry === "qr" ? "QR" : entry.charAt(0).toUpperCase() + entry.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Available centers" subtitle="Open centers appear first, but you can still see the full center list.">
        {centers.length ? (
          centers.map((center) => (
            <Pressable
              key={center.id}
              onPress={() => setSelectedCenterId(center.id)}
              className={`mb-3 rounded-2xl border px-4 py-4 ${selectedCenterId === center.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
            >
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">{center.name}</Text>
                  <Text className="mt-1 text-sm text-slate-500">{center.address}</Text>
                </View>
                <Pill label={center.is_open ? "Open" : "Closed"} tone={center.is_open ? "success" : "warning"} />
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="No centers available"
            description="Center options will appear here once your barangay has published evacuation locations."
          />
        )}
      </SectionCard>

      {mode === "qr" ? (
        <SectionCard title="QR token" subtitle="Use this fallback input when camera scanning is unavailable in the current build.">
          <TextField
            label="QR token"
            value={qrToken}
            onChangeText={setQrToken}
            placeholder="Paste the center QR token"
          />
          <View className="mt-4">
            <AppButton label="Submit QR check-in" onPress={() => void handleQrCheckIn()} loading={qrMutation.isPending} />
          </View>
        </SectionCard>
      ) : null}

      {mode === "manual" ? (
        <SectionCard title="Manual check-in" subtitle="Use your registered household by default and add optional notes.">
          <TextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes for barangay responders"
            multiline
          />
          <View className="mt-4">
            <AppButton label="Submit manual check-in" onPress={() => void handleManualCheckIn()} loading={manualMutation.isPending} />
          </View>
        </SectionCard>
      ) : null}

      {mode === "proxy" ? (
        <SectionCard title="Proxy check-in" subtitle="Search a household registry entry and submit a check-in on its behalf.">
          <TextField
            label="Search household"
            value={proxySearch}
            onChangeText={setProxySearch}
            placeholder="Household head, purok, or address"
          />
          <View className="mt-4 gap-3">
            {(proxySearchQuery.data ?? []).map((household) => (
              <Pressable
                key={household.id}
                onPress={() => setSelectedProxyHouseholdId(household.id)}
                className={`rounded-2xl border px-4 py-4 ${selectedProxyHouseholdId === household.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
              >
                <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {household.purok} • {household.address}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-4">
            <AppButton label="Submit proxy check-in" onPress={() => void handleProxyCheckIn()} loading={proxyMutation.isPending} />
          </View>
        </SectionCard>
      ) : null}

      {feedback ? (
        <SectionCard>
          <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
        </SectionCard>
      ) : null}
    </View>
  );
}
