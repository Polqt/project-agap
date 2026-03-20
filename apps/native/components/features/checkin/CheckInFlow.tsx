import type { HouseholdMember } from "@project-agap/api/supabase";

import * as NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/app/empty-state";
import { SectionCard } from "@/components/app/section-card";
import { ManualCheckIn } from "@/components/features/checkin/ManualCheckIn";
import { QrScanner } from "@/components/features/checkin/QrScanner";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useAuth } from "@/providers/AuthProvider";
import { haptics } from "@/services/haptics";
import { getCurrentCoordinates } from "@/utils/location";
import { getErrorMessage } from "@/utils/format";
import { trpc, trpcClient } from "@/utils/trpc";

type CheckInMode = "qr" | "manual";

type CheckInSuccessState = {
  centerId: string | null;
  centerName: string | null;
  timestamp: string;
};

const HouseholdMemberRow = memo(function HouseholdMemberRow({
  item,
  isSelected,
  onPress,
}: {
  item: HouseholdMember;
  isSelected: boolean;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      className={`mb-3 rounded-2xl border px-4 py-4 ${
        isSelected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
      onPress={() => onPress(item.id)}
    >
      <Text className="text-base font-semibold text-slate-900">{item.full_name}</Text>
      <Text className="mt-1 text-sm text-slate-600">
        {item.age !== null ? `${item.age} years old` : "Age not provided"}
      </Text>
    </Pressable>
  );
});

export function CheckInFlow() {
  const params = useLocalSearchParams<{ centerId?: string; mode?: string }>();
  const { profile } = useAuth();
  const { enqueue } = useOfflineQueue();
  const [mode, setMode] = useState<CheckInMode>(params.mode === "manual" ? "manual" : "qr");
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(params.centerId ?? null);
  const [successState, setSuccessState] = useState<CheckInSuccessState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{
    latitude?: number;
    longitude?: number;
  }>({});

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      {
        barangayId: profile?.barangay_id ?? "",
      },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );
  const householdQuery = useQuery(trpc.households.getMine.queryOptions());

  useEffect(() => {
    void getCurrentCoordinates().then((value) => {
      setCoordinates({
        latitude: value?.latitude,
        longitude: value?.longitude,
      });
    });
  }, []);

  const openCenters = useMemo(
    () => (centersQuery.data ?? []).filter((center) => center.is_open),
    [centersQuery.data],
  );
  const household = householdQuery.data;

  const handleManualCheckIn = useCallback(async () => {
    if (!selectedCenterId) {
      setErrorMessage("Pumili muna ng evacuation center.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await haptics.medium();

      const networkState = await NetInfo.fetch();
      const isOnline = !!networkState.isConnected && !!networkState.isInternetReachable;
      const payload = {
        centerId: selectedCenterId,
        householdId: household?.id ?? undefined,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      if (!isOnline) {
        await enqueue({
          type: "check_in",
          payload: {
            mutation: "manual",
            input: payload,
          },
        });
        setSuccessState({
          centerId: selectedCenterId,
          centerName:
            openCenters.find((center) => center.id === selectedCenterId)?.name ?? "Selected center",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await trpcClient.checkIns.manual.mutate(payload);
      const center = openCenters.find((item) => item.id === result.center_id);
      await haptics.success();
      setSuccessState({
        centerId: result.center_id,
        centerName: center?.name ?? "Evacuation center",
        timestamp: result.checked_in_at,
      });
    } catch (error) {
      await haptics.error();
      setErrorMessage(getErrorMessage(error, "Hindi makapag-check in. Subukan muli."));
    } finally {
      setIsSubmitting(false);
    }
  }, [coordinates.latitude, coordinates.longitude, enqueue, household?.id, openCenters, selectedCenterId]);

  const handleQrScan = useCallback(
    async ({ data }: { data: string }) => {
      if (hasScanned) {
        return;
      }

      try {
        setHasScanned(true);
        setErrorMessage(null);
        await haptics.medium();

        const result = await trpcClient.checkIns.byQr.mutate({
          qrToken: data,
          householdId: household?.id ?? undefined,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });

        if (!result.success) {
          await haptics.error();
          setErrorMessage("QR code is invalid or this center is closed");
          setHasScanned(false);
          return;
        }

        await haptics.success();
        setSuccessState({
          centerId: result.center_id,
          centerName: result.center_name,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        await haptics.error();
        setErrorMessage(getErrorMessage(error, "QR code is invalid or this center is closed"));
        setHasScanned(false);
      }
    },
    [coordinates.latitude, coordinates.longitude, hasScanned, household?.id],
  );

  const handleMemberToggle = useCallback((memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((item) => item !== memberId)
        : [...current, memberId],
    );
  }, []);

  const handleProxyCheckIn = useCallback(async () => {
    if (!successState?.centerId || !household?.id || selectedMemberIds.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await haptics.medium();

      const networkState = await NetInfo.fetch();
      const isOnline = !!networkState.isConnected && !!networkState.isInternetReachable;
      const payload = {
        centerId: successState.centerId,
        householdId: household.id,
        memberIds: selectedMemberIds,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      if (!isOnline) {
        await enqueue({
          type: "check_in",
          payload: {
            mutation: "proxy",
            input: payload,
          },
        });
      } else {
        await trpcClient.checkIns.proxy.mutate(payload);
      }

      await haptics.success();
      setSelectedMemberIds([]);
    } catch (error) {
      await haptics.error();
      setErrorMessage(getErrorMessage(error, "Hindi ma-save ang proxy check-in."));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    coordinates.latitude,
    coordinates.longitude,
    enqueue,
    household?.id,
    selectedMemberIds,
    successState?.centerId,
  ]);

  const renderMember = useCallback(
    ({ item }: { item: HouseholdMember }) => (
      <HouseholdMemberRow
        isSelected={selectedMemberIds.includes(item.id)}
        item={item}
        onPress={handleMemberToggle}
      />
    ),
    [handleMemberToggle, selectedMemberIds],
  );

  return (
    <View className="flex-1 gap-5 px-6 py-6">
      <View className="flex-row gap-3">
        <Pressable
          className={`flex-1 rounded-2xl px-4 py-3 ${mode === "qr" ? "bg-blue-600" : "bg-white"}`}
          onPress={() => setMode("qr")}
        >
          <Text className={`text-center font-semibold ${mode === "qr" ? "text-white" : "text-slate-900"}`}>
            QR Mode
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 rounded-2xl px-4 py-3 ${mode === "manual" ? "bg-blue-600" : "bg-white"}`}
          onPress={() => setMode("manual")}
        >
          <Text className={`text-center font-semibold ${mode === "manual" ? "text-white" : "text-slate-900"}`}>
            Manual Mode
          </Text>
        </Pressable>
      </View>

      {mode === "qr" ? (
        <SectionCard
          title="Scan evacuation QR"
          description="Point the camera at the center QR code. If the camera is unavailable, switch to manual mode."
        >
          <QrScanner onFallback={() => setMode("manual")} onScan={(result) => void handleQrScan(result)} />
        </SectionCard>
      ) : (
        <SectionCard
          title="Manual check-in"
          description="Open evacuation centers only. If the connection drops, we queue the check-in and send it later."
        >
          {openCenters.length > 0 ? (
            <ManualCheckIn
              centers={openCenters}
              selectedCenterId={selectedCenterId}
              onSelectCenter={setSelectedCenterId}
            />
          ) : (
            <EmptyState
              title="No open centers"
              description="The barangay has not marked any evacuation centers as open yet."
            />
          )}
          <Pressable
            className="rounded-2xl bg-[#1A56C4] px-4 py-4"
            onPress={() => void handleManualCheckIn()}
          >
            <Text className="text-center text-base font-semibold text-white">
              {isSubmitting ? "Submitting..." : "Submit check-in"}
            </Text>
          </Pressable>
        </SectionCard>
      )}

      {errorMessage ? (
        <Text className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </Text>
      ) : null}

      {successState ? (
        <SectionCard
          title="Check-in successful"
          description={`${successState.centerName ?? "Evacuation center"} • ${new Date(
            successState.timestamp,
          ).toLocaleString()}`}
          accentClassName="bg-emerald-50"
        >
          <Text className="text-base font-semibold text-emerald-700">You are now logged at the center.</Text>
          {household?.household_members.length ? (
            <View className="gap-3">
              <Text className="text-sm font-medium text-slate-700">
                Are any household members with you?
              </Text>
              <FlatList
                data={household.household_members}
                keyExtractor={(item) => item.id}
                renderItem={renderMember}
                removeClippedSubviews
                showsVerticalScrollIndicator={false}
              />
              <Pressable
                className="rounded-2xl bg-slate-950 px-4 py-4"
                onPress={() => void handleProxyCheckIn()}
              >
                <Text className="text-center font-semibold text-white">
                  {isSubmitting ? "Saving..." : "Save proxy check-in"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </SectionCard>
      ) : null}
    </View>
  );
}
