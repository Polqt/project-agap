import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { formatDistanceKm, haversineDistanceKm } from "@/shared/utils/geo";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";

import type { EvacuationCenter } from "@project-agap/api/supabase";

type Mode = "qr" | "manual";

export function CheckInFlow({ kioskMode = false }: { kioskMode?: boolean }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isOnline, queueAction } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));

  const [mode, setMode] = useState<Mode>("qr");
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isScanLocked, setIsScanLocked] = useState(false);
  const [checkedInMembers, setCheckedInMembers] = useState<string[]>([]);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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

  const allCenters = centersQuery.data ?? [];

  const sortedCenters = useMemo(() => {
    return [...allCenters].sort((a, b) => {
      // Open centers first
      if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
      // Then by distance
      const da = location
        ? haversineDistanceKm(location.latitude, location.longitude, a.latitude, a.longitude)
        : Number.MAX_SAFE_INTEGER;
      const db = location
        ? haversineDistanceKm(location.latitude, location.longitude, b.latitude, b.longitude)
        : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [allCenters, location]);

  const openCenters = useMemo(() => allCenters.filter((c) => c.is_open), [allCenters]);

  // Auto-select first open center
  useEffect(() => {
    if (!openCenters.length) {
      setSelectedCenterId(null);
      return;
    }
    if (!selectedCenterId || !openCenters.some((c) => c.id === selectedCenterId)) {
      setSelectedCenterId(openCenters[0]?.id ?? null);
    }
  }, [openCenters, selectedCenterId]);

  const manualMutation = useMutation(trpc.checkIns.manual.mutationOptions());
  const qrMutation = useMutation(trpc.checkIns.byQr.mutationOptions());

  const household = householdQuery.data ?? null;
  const members = household?.household_members ?? [];

  function toggleMember(id: string) {
    setCheckedInMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (qrMutation.isPending || isScanLocked) return;
      setIsScanLocked(true);
      void submitQr(result.data);
    },
    [qrMutation.isPending, isScanLocked],
  );

  async function submitQr(token: string) {
    const payload = {
      qrToken: token,
      householdId: household?.id ?? undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);
    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.qr", payload));
      setFeedback("Queued offline.");
      setCheckInSuccess(true);
      return;
    }

    try {
      await qrMutation.mutateAsync(payload);
      setFeedback("QR check-in submitted.");
      setCheckInSuccess(true);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.qr", payload));
        setFeedback("Connection dropped. Queued.");
        setCheckInSuccess(true);
        return;
      }
      setFeedback(getErrorMessage(error, "QR check-in failed."));
      setIsScanLocked(false);
    }
  }

  async function submitManual() {
    if (!selectedCenterId) {
      setFeedback("Select an open center first.");
      return;
    }

    const payload = {
      centerId: selectedCenterId,
      householdId: household?.id ?? undefined,
      notes: notes.trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setFeedback(null);
    if (!isOnline) {
      await queueAction(createQueuedAction("check-in.manual", payload));
      setFeedback("Queued offline.");
      setNotes("");
      setCheckInSuccess(true);
      return;
    }

    try {
      await manualMutation.mutateAsync(payload);
      setFeedback("Check-in submitted.");
      setNotes("");
      setCheckInSuccess(true);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("check-in.manual", payload));
        setFeedback("Connection dropped. Queued.");
        setNotes("");
        setCheckInSuccess(true);
        return;
      }
      setFeedback(getErrorMessage(error, "Check-in failed."));
    }
  }

  async function handleRequestPermission() {
    const next = await requestPermission();
    if (!next.granted) {
      setMode("manual");
      setFeedback("Camera access unavailable. Use manual check-in.");
    }
  }

  function resetFlow() {
    setCheckInSuccess(false);
    setIsScanLocked(false);
    setCheckedInMembers([]);
    setFeedback(null);
  }

  // Post-check-in: show household members checklist
  if (checkInSuccess && members.length > 0) {
    return (
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-[18px] font-bold text-slate-900">Check-In</Text>
                <Text className="text-[13px] text-slate-500">After check-in \u2014 add household members</Text>
              </View>
            </View>

            <Text className="mt-5 text-[13px] font-semibold uppercase tracking-wider text-slate-400">
              Proxy check-in
            </Text>
            <Text className="mt-1 text-[13px] text-slate-500">
              Tick members who are physically present.
            </Text>

            <View className="mt-4 gap-2">
              {members.map((member) => {
                const checked = checkedInMembers.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => toggleMember(member.id)}
                    className={`flex-row items-center justify-between rounded-xl border px-4 py-3.5 ${
                      checked ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-[15px] font-medium text-slate-900">
                        {member.full_name}
                      </Text>
                      <Text className="text-[12px] text-slate-500">
                        {member.age != null ? `Age ${member.age}` : ""}
                        {member.vulnerability_flags?.length
                          ? ` \u00b7 ${member.vulnerability_flags.join(", ")}`
                          : ""}
                      </Text>
                    </View>
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-md ${
                        checked ? "bg-blue-600" : "border border-slate-300 bg-white"
                      }`}
                    >
                      {checked ? <Ionicons name="checkmark" size={14} color="white" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={resetFlow}
              className="mt-6 items-center rounded-xl bg-slate-900 py-3.5"
            >
              <Text className="text-[14px] font-semibold text-white">Done</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Post-check-in without members: simple success
  if (checkInSuccess) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Ionicons name="checkmark-circle" size={36} color="#059669" />
        </View>
        <Text className="mt-4 text-[18px] font-bold text-slate-900">Check-in recorded</Text>
        <Text className="mt-1 text-center text-[14px] text-slate-500">{feedback}</Text>
        <Pressable
          onPress={resetFlow}
          className="mt-6 rounded-xl bg-slate-900 px-8 py-3.5"
        >
          <Text className="text-[14px] font-semibold text-white">Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-5">
          <Text className="text-[22px] font-bold text-slate-900">Check-In</Text>
        </View>

        {/* Segmented control */}
        <View className="mx-5 mt-4 flex-row rounded-xl bg-slate-100 p-1">
          {(["qr", "manual"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className={`flex-1 items-center rounded-lg py-2.5 ${
                mode === m ? "bg-white shadow-sm" : ""
              }`}
            >
              <View className="flex-row items-center gap-1.5">
                <Ionicons
                  name={m === "qr" ? "qr-code-outline" : "list-outline"}
                  size={15}
                  color={mode === m ? "#0f172a" : "#64748b"}
                />
                <Text
                  className={`text-[13px] font-semibold ${
                    mode === m ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {m === "qr" ? "Scan QR" : "Manual"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* QR Mode */}
        {mode === "qr" ? (
          <View className="mt-4 px-5">
            {!permission?.granted ? (
              <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10">
                <Ionicons name="camera-outline" size={40} color="#94a3b8" />
                <Text className="mt-3 text-center text-[14px] font-medium text-slate-700">
                  Camera permission required
                </Text>
                <Text className="mt-1 text-center text-[13px] text-slate-500">
                  Point at the evacuation center QR code
                </Text>
                <Pressable
                  onPress={() => void handleRequestPermission()}
                  className="mt-4 rounded-xl bg-slate-900 px-6 py-3"
                >
                  <Text className="text-[14px] font-semibold text-white">Allow camera</Text>
                </Pressable>
              </View>
            ) : (
              <View className="overflow-hidden rounded-2xl bg-slate-950" style={{ height: 340 }}>
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
                {/* Scan zone overlay */}
                <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                  <View className="h-48 w-48 rounded-2xl border-2 border-white/60" />
                </View>
              </View>
            )}
            {isScanLocked ? (
              <Pressable
                onPress={() => setIsScanLocked(false)}
                className="mt-3 items-center rounded-xl border border-slate-200 py-2.5"
              >
                <Text className="text-[13px] font-medium text-slate-600">Scan another code</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Manual Mode */}
        {mode === "manual" ? (
          <View className="mt-4 px-5">
            <Text className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">
              Choose your evacuation center
            </Text>
            <View className="mt-3 gap-2">
              {sortedCenters.map((center) => {
                const dist = location
                  ? haversineDistanceKm(
                      location.latitude,
                      location.longitude,
                      center.latitude,
                      center.longitude,
                    )
                  : null;
                const selected = selectedCenterId === center.id;
                const closed = !center.is_open;

                return (
                  <Pressable
                    key={center.id}
                    onPress={() => {
                      if (center.is_open) setSelectedCenterId(center.id);
                    }}
                    className={`flex-row items-center justify-between rounded-xl border px-3.5 py-3 ${
                      closed
                        ? "border-slate-100 bg-slate-50 opacity-45"
                        : selected
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-slate-900">{center.name}</Text>
                      <Text className="text-[12px] text-slate-500">
                        {center.address}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-3">
                        {dist != null ? (
                          <Text className="text-[11px] font-medium text-blue-600">
                            {formatDistanceKm(dist)}
                          </Text>
                        ) : null}
                        {/* Mini occupancy bar */}
                        <View className="flex-1 flex-row items-center gap-2">
                          <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <View
                              className={`h-full rounded-full ${
                                center.current_occupancy / Math.max(1, center.capacity) > 0.8
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.min(100, (center.current_occupancy / Math.max(1, center.capacity)) * 100)}%`,
                              }}
                            />
                          </View>
                          <Text className="text-[10px] text-slate-400">
                            {center.current_occupancy}/{center.capacity}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View
                      className={`ml-2 rounded-full px-2 py-0.5 ${
                        center.is_open ? "bg-emerald-100" : "bg-rose-100"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-semibold ${
                          center.is_open ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {center.is_open ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {sortedCenters.length === 0 ? (
              <View className="mt-4 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6">
                <Text className="text-[14px] font-semibold text-slate-600">No centers available</Text>
                <Text className="mt-1 text-center text-[13px] text-slate-400">
                  Check back when your barangay opens an evacuation center.
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void submitManual()}
              disabled={manualMutation.isPending || !openCenters.length}
              className={`mt-4 items-center rounded-xl py-3.5 ${
                openCenters.length ? "bg-slate-900 active:bg-slate-800" : "bg-slate-300"
              }`}
            >
              <Text className="text-[14px] font-semibold text-white">
                {manualMutation.isPending ? "Submitting..." : "Check in here"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Feedback */}
        {feedback && !checkInSuccess ? (
          <View className="mx-5 mt-3 rounded-xl bg-slate-100 px-4 py-2.5">
            <Text className="text-[13px] text-slate-600">{feedback}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
