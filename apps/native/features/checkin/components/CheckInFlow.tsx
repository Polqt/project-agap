import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { AppButton, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";

import { CenterPickerCard } from "./CenterPickerCard";
import { CheckInModeSelector } from "./CheckInModeSelector";
import { ProxyHouseholdPickerCard } from "./ProxyHouseholdPickerCard";
import { ProxyMemberSelectorCard } from "./ProxyMemberSelectorCard";
import { QrCheckInCard } from "./QrCheckInCard";
import { useCheckInFlow } from "../hooks/useCheckInFlow";

const kioskModes = ["manual", "qr"] as const;

export function CheckInFlow({ kioskMode = false }: { kioskMode?: boolean }) {
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
  } = useCheckInFlow({ kioskMode });

  const btnSize = kioskMode ? "kiosk" : "default";

  const body = (
    <>
      {!kioskMode ? (
        <ScreenHeader
          eyebrow="5.2.3 Check-in"
          title="Evacuation center check-in"
          description="Scan a center QR code for instant validation, fall back to manual selection when needed, and log proxy arrivals for another household."
        />
      ) : null}

      <CheckInModeSelector
        mode={mode}
        onChange={setMode}
        modes={kioskMode ? [...kioskModes] : undefined}
        kiosk={kioskMode}
      />

      {mode === "qr" ? (
        <QrCheckInCard
          isSubmitting={qrMutation.isPending}
          onScan={submitQrCheckIn}
          onManualFallback={handleQrFallback}
          kiosk={kioskMode}
        />
      ) : null}

      {mode === "manual" ? (
        <>
          <CenterPickerCard
            centers={centers}
            selectedCenterId={selectedCenterId}
            onSelect={setSelectedCenterId}
            kiosk={kioskMode}
          />
          <SectionCard
            title={kioskMode ? "Walk-in check-in" : "Manual check-in"}
            subtitle={
              kioskMode
                ? "Walang smartphone? Piliin ang center. Household ay opsyonal."
                : "Use your registered household by default and add optional notes for responders."
            }
          >
            <Text
              className={`mb-4 leading-6 ${kioskMode ? "text-lg text-slate-200" : "text-sm text-slate-600"}`}
            >
              {kioskMode
                ? household
                  ? `Kasama ang household: ${household.household_head}`
                  : "Walk-in — walang naka-link na household (OK)."
                : household
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
                label={kioskMode ? "Check-in" : "Submit manual check-in"}
                onPress={() => void submitManualCheckIn()}
                loading={manualMutation.isPending}
                disabled={!hasOpenCenters}
                size={btnSize}
              />
            </View>
          </SectionCard>
        </>
      ) : null}

      {!kioskMode && mode === "proxy" ? (
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
          <Text className={`leading-6 ${kioskMode ? "text-base text-amber-100" : "text-sm text-slate-600"}`}>
            {feedback}
          </Text>
        </SectionCard>
      ) : null}
    </>
  );

  if (kioskMode) {
    return (
      <KeyboardAwareScrollView
        className="flex-1 bg-neutral-950"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bottomOffset={24}
        nestedScrollEnabled
      >
        {body}
      </KeyboardAwareScrollView>
    );
  }

  return <View className="flex-1 bg-slate-50 pb-8">{body}</View>;
}
