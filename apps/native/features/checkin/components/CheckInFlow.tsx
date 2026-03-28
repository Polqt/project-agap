import { Text, View } from "react-native";

import { AppButton, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";

import { CenterPickerCard } from "./CenterPickerCard";
import { CheckInModeSelector } from "./CheckInModeSelector";
import { ProxyHouseholdPickerCard } from "./ProxyHouseholdPickerCard";
import { ProxyMemberSelectorCard } from "./ProxyMemberSelectorCard";
import { QrCheckInCard } from "./QrCheckInCard";
import { useCheckInFlow } from "../hooks/useCheckInFlow";

export function CheckInFlow() {
  const {
    mode,
    setMode,
    selectedCenterId,
    setSelectedCenterId,
    proxySearch,
    setProxySearch,
    selectedProxyHouseholdId,
    handleProxyHouseholdSelect,
    selectedProxyMemberIds,
    toggleProxyMember,
    notes,
    setNotes,
    feedback,
    household,
    centers,
    hasOpenCenters,
    proxyHouseholds,
    isSearchingProxyHouseholds,
    selectedProxyHousehold,
    proxyMembers,
    isLoadingProxyHousehold,
    manualMutation,
    qrMutation,
    proxyMutation,
    submitManualCheckIn,
    submitQrCheckIn,
    submitProxyCheckIn,
    handleQrFallback,
  } = useCheckInFlow();

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.3 Check-in"
        title="Evacuation center check-in"
        description="Scan a center QR code for instant validation, fall back to manual selection when needed, and log proxy arrivals for another household."
      />

      <CheckInModeSelector mode={mode} onChange={setMode} />

      {mode === "qr" ? (
        <QrCheckInCard
          isSubmitting={qrMutation.isPending}
          onScan={submitQrCheckIn}
          onManualFallback={handleQrFallback}
        />
      ) : null}

      {mode === "manual" ? (
        <>
          <CenterPickerCard
            centers={centers}
            selectedCenterId={selectedCenterId}
            onSelect={setSelectedCenterId}
          />
          <SectionCard
            title="Manual check-in"
            subtitle="Use your registered household by default and add optional notes for responders."
          >
            <Text className="mb-4 text-sm leading-6 text-slate-600">
              {household
                ? `Checking in household: ${household.household_head}`
                : "Your household registration will be attached automatically when available."}
            </Text>
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
                disabled={!hasOpenCenters}
              />
            </View>
          </SectionCard>
        </>
      ) : null}

      {mode === "proxy" ? (
        <>
          <CenterPickerCard
            centers={centers}
            selectedCenterId={selectedCenterId}
            onSelect={setSelectedCenterId}
          />
          <ProxyHouseholdPickerCard
            searchValue={proxySearch}
            onChangeSearch={setProxySearch}
            households={proxyHouseholds}
            selectedHouseholdId={selectedProxyHouseholdId}
            onSelectHousehold={handleProxyHouseholdSelect}
            isLoading={isSearchingProxyHouseholds}
          />
          <ProxyMemberSelectorCard
            household={selectedProxyHousehold}
            members={proxyMembers}
            selectedMemberIds={selectedProxyMemberIds}
            onToggleMember={toggleProxyMember}
            isLoading={isLoadingProxyHousehold}
          />
          <SectionCard
            title="Proxy check-in notes"
            subtitle="Add extra details for responders, then submit the proxy check-in."
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
                label="Submit proxy check-in"
                onPress={() => void submitProxyCheckIn()}
                loading={proxyMutation.isPending}
                disabled={!hasOpenCenters}
              />
            </View>
          </SectionCard>
        </>
      ) : null}

      {feedback ? (
        <SectionCard>
          <Text className="text-sm leading-6 text-slate-600">{feedback}</Text>
        </SectionCard>
      ) : null}
    </View>
  );
}
