import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { AppButton, EmptyState, Pill, SectionCard } from "@/shared/components/ui";
import { trpc } from "@/services/trpc";
import { getErrorMessage, isOfflineLikeError } from "@/shared/utils/errors";
import {
  getOfflineCenterSupplies,
  getOfflineScope,
  patchOfflineCenterSupplies,
  syncOfflineCenterSupplies,
} from "@/services/offlineData";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";
import type { EvacuationCenter } from "@project-agap/api/supabase";

type Props = {
  centers: EvacuationCenter[];
  onToggle: (centerId: string, isOpen: boolean) => void;
};

function SupplyRow({ label, value, low }: { label: string; value: number; low: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-0.5">
      <Text className="text-[12px] text-slate-500">{label}</Text>
      <Text className={`text-[12px] font-semibold ${low ? "text-rose-600" : "text-slate-700"}`}>
        {value} {low ? "⚠" : ""}
      </Text>
    </View>
  );
}

function CenterSuppliesSection({ centerId }: { centerId: string }) {
  const { profile } = useAuth();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ food: "", water: "", medicine: "", blankets: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const { isOnline, queueAction } = useOfflineQueue();
  const offlineScope = getOfflineScope(profile);

  const suppliesQuery = useQuery({
    queryKey: ["offline", "center-supplies", offlineScope?.scopeId, centerId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflineCenterSupplies(offlineScope!.scopeId, centerId),
  });
  const updateMutation = useMutation(trpc.evacuationCenters.updateSupplies.mutationOptions());

  const supplies = suppliesQuery.data;
  if (!supplies) return null;

  async function handleSave() {
    if (!supplies) {
      return;
    }

    setFeedback(null);

    const nextPatch = {
      ...(draft.food !== "" ? { food_packs: Number(draft.food) } : {}),
      ...(draft.water !== "" ? { water_liters: Number(draft.water) } : {}),
      ...(draft.medicine !== "" ? { medicine_units: Number(draft.medicine) } : {}),
      ...(draft.blankets !== "" ? { blankets: Number(draft.blankets) } : {}),
      updated_at: new Date().toISOString(),
      updated_by: offlineScope?.profileId ?? null,
    };

    try {
      if (offlineScope) {
        await patchOfflineCenterSupplies(offlineScope.scopeId, centerId, nextPatch);
        bumpOfflineDataGeneration();
      }

      const payload = {
        centerId,
        ...(draft.food !== "" ? { foodPacks: Number(draft.food) } : {}),
        ...(draft.water !== "" ? { waterLiters: Number(draft.water) } : {}),
        ...(draft.medicine !== "" ? { medicineUnits: Number(draft.medicine) } : {}),
        ...(draft.blankets !== "" ? { blankets: Number(draft.blankets) } : {}),
        expectedUpdatedAt: supplies.updated_at ?? null,
      };

      if (!isOnline) {
        await queueAction(createQueuedAction("center.update-supplies", payload, offlineScope));
        setEditing(false);
        setDraft({ food: "", water: "", medicine: "", blankets: "" });
        setFeedback("Center supplies queued offline.");
        return;
      }

      await updateMutation.mutateAsync(payload);

      if (offlineScope) {
        await syncOfflineCenterSupplies(offlineScope, centerId);
        bumpOfflineDataGeneration();
      }

      setEditing(false);
      setDraft({ food: "", water: "", medicine: "", blankets: "" });
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(
          createQueuedAction("center.update-supplies", {
            centerId,
            ...(draft.food !== "" ? { foodPacks: Number(draft.food) } : {}),
            ...(draft.water !== "" ? { waterLiters: Number(draft.water) } : {}),
            ...(draft.medicine !== "" ? { medicineUnits: Number(draft.medicine) } : {}),
            ...(draft.blankets !== "" ? { blankets: Number(draft.blankets) } : {}),
            expectedUpdatedAt: supplies.updated_at ?? null,
          }, offlineScope),
        );
        setEditing(false);
        setDraft({ food: "", water: "", medicine: "", blankets: "" });
        setFeedback("Connection dropped. Center supplies queued for auto-sync.");
        return;
      }

      if (offlineScope) {
        await syncOfflineCenterSupplies(offlineScope, centerId).catch(() => {});
        bumpOfflineDataGeneration();
      }
      setFeedback(getErrorMessage(error, "Unable to update center supplies."));
    }
  }

  return (
    <View className="mt-3 rounded-xl bg-white p-3 border border-slate-100">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Supplies</Text>
        <Pressable onPress={() => setEditing(true)}>
          <Text className="text-[11px] font-semibold text-blue-600">Update</Text>
        </Pressable>
      </View>
      <SupplyRow label="Food packs" value={supplies.food_packs} low={supplies.food_packs < 10} />
      <SupplyRow label="Water (L)" value={supplies.water_liters} low={supplies.water_liters < 50} />
      <SupplyRow label="Medicine" value={supplies.medicine_units} low={supplies.medicine_units < 5} />
      <SupplyRow label="Blankets" value={supplies.blankets} low={supplies.blankets < 10} />
      {feedback ? (
        <Text className="mt-2 text-[12px] font-medium text-rose-600">{feedback}</Text>
      ) : null}

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50" onPress={() => setEditing(false)}>
          <Pressable className="mx-6 w-full max-w-sm rounded-2xl bg-white p-6" onPress={(e) => e.stopPropagation()}>
            <Text className="mb-4 text-[16px] font-bold text-slate-900">Update Supplies</Text>
            {(["food", "water", "medicine", "blankets"] as const).map((key) => (
              <View key={key} className="mb-3">
                <Text className="mb-1 text-[12px] font-medium text-slate-600 capitalize">
                  {key === "food" ? "Food packs" : key === "water" ? "Water (liters)" : key === "medicine" ? "Medicine units" : "Blankets"}
                </Text>
                <TextInput
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[14px] text-slate-900"
                  value={draft[key]}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  keyboardType="number-pad"
                  placeholder={`${key === "food" ? supplies.food_packs : key === "water" ? supplies.water_liters : key === "medicine" ? supplies.medicine_units : supplies.blankets}`}
                />
              </View>
            ))}
            <AppButton label="Save" onPress={() => void handleSave()} loading={updateMutation.isPending} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function CenterStatusCard({
  centers,
  onToggle,
}: Props) {
  return (
    <SectionCard
      title="Evacuation centers"
      subtitle="Open or close center availability directly from the dashboard."
    >
      {centers.length ? (
        centers.map((center) => (
          <View key={center.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">{center.name}</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {center.current_occupancy}/{center.capacity} occupants
                </Text>
              </View>
              <Pill
                label={center.is_open ? "Open" : "Closed"}
                tone={center.is_open ? "success" : "warning"}
              />
            </View>
            <CenterSuppliesSection centerId={center.id} />
            <View className="mt-4">
              <AppButton
                label={center.is_open ? "Close center" : "Open center"}
                onPress={() => onToggle(center.id, !center.is_open)}
                variant={center.is_open ? "secondary" : "primary"}
              />
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          title="No centers configured"
          description="Center controls will appear here after evacuation centers are created for the barangay."
        />
      )}
    </SectionCard>
  );
}
