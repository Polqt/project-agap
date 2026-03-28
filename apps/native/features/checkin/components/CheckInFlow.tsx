import { Text, View, Pressable } from "react-native";

import { AppButton, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";

import { CenterPickerCard } from "./CenterPickerCard";
import { CheckInModeSelector } from "./CheckInModeSelector";
import { useCheckInFlow } from "../hooks/useCheckInFlow";

export function CheckInFlow() {
  const {
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
    centers,
    proxyHouseholds,
    manualMutation,
    qrMutation,
    proxyMutation,
    submitManualCheckIn,
    submitQrCheckIn,
    submitProxyCheckIn,
  } = useCheckInFlow();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.3 Check-in"
        title="Evacuation center check-in"
        description="Residents can check in manually or by QR token, and submit proxy check-ins for another household when needed."
      />

      <CheckInModeSelector mode={mode} onChange={setMode} />
      <CenterPickerCard
        centers={centers}
        selectedCenterId={selectedCenterId}
        onSelect={setSelectedCenterId}
      />

      {mode === "qr" ? (
        <SectionCard
          title="QR token"
          subtitle="Use this fallback input when camera scanning is unavailable in the current build."
        >
          <TextField
            label="QR token"
            value={qrToken}
            onChangeText={setQrToken}
            placeholder="Paste the center QR token"
          />
          <View className="mt-4">
            <AppButton
              label="Submit QR check-in"
              onPress={() => void submitQrCheckIn()}
              loading={qrMutation.isPending}
            />
          </View>
        </SectionCard>
      ) : null}

      {mode === "manual" ? (
        <SectionCard
          title="Manual check-in"
          subtitle="Use your registered household by default and add optional notes."
        >
          <TextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes for barangay responders"
            multiline
          />
          <View className="mt-4">
            <AppButton
              label="Submit manual check-in"
              onPress={() => void submitManualCheckIn()}
              loading={manualMutation.isPending}
            />
          </View>
        </SectionCard>
      ) : null}

      {mode === "proxy" ? (
        <SectionCard
          title="Proxy check-in"
          subtitle="Search a household registry entry and submit a check-in on its behalf."
        >
          <TextField
            label="Search household"
            value={proxySearch}
            onChangeText={setProxySearch}
            placeholder="Household head, purok, or address"
          />
          <View className="mt-4 gap-3">
            {proxyHouseholds.map((household) => (
              <Pressable
                key={household.id}
                onPress={() => setSelectedProxyHouseholdId(household.id)}
                className={`rounded-2xl border px-4 py-4 ${selectedProxyHouseholdId === household.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
              >
                <Text className="text-base font-semibold text-slate-950">{household.household_head}</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {household.purok} | {household.address}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-4">
            <AppButton
              label="Submit proxy check-in"
              onPress={() => void submitProxyCheckIn()}
              loading={proxyMutation.isPending}
            />
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
