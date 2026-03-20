import type { Household } from "@project-agap/api/supabase";

import BottomSheet from "@gorhom/bottom-sheet";
import * as NetInfo from "@react-native-community/netinfo";
import { useStore } from "@tanstack/react-store";
import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";

import { CrossPingSheet } from "@/components/features/status/CrossPingSheet";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { connectivityStore } from "@/stores/connectivity.store";
import { haptics } from "@/services/haptics";
import { getCurrentCoordinates } from "@/utils/location";
import { formatPingStatus, formatRelativeTime, getErrorMessage } from "@/utils/format";
import { T } from "@/utils/i18n";
import { trpc, trpcClient } from "@/utils/trpc";

export const PingButtons = memo(function PingButtons() {
  const { enqueue, isFlushing, queueSize } = useOfflineQueue();
  const bottomSheetRef = useRef<BottomSheet | null>(null);
  const latestPingQuery = useQuery(trpc.statusPings.getLatestMine.queryOptions());
  const connectivity = useStore(connectivityStore, (state) => state);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Household[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState<"safe" | "need_help" | null>(null);

  useEffect(() => {
    let isActive = true;

    async function runSearch() {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const results = await trpcClient.households.search.query({
          query: searchQuery.trim(),
        });

        if (isActive) {
          setSearchResults(results);
        }
      } catch {
        if (isActive) {
          setSearchResults([]);
        }
      } finally {
        if (isActive) {
          setSearching(false);
        }
      }
    }

    void runSearch();

    return () => {
      isActive = false;
    };
  }, [searchQuery]);

  const submitStatus = useCallback(
    async (status: "safe" | "need_help", householdId?: string | null) => {
      try {
        setSubmittingStatus(status);
        await haptics.heavy();

        const coordinates = await getCurrentCoordinates();
        const networkState = await NetInfo.fetch();
        const isOnline = !!networkState.isConnected && !!networkState.isInternetReachable;
        const input = {
          householdId: householdId ?? undefined,
          status,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        };

        if (!isOnline) {
          await enqueue({
            type: "status_ping",
            payload: input,
          });
          setMessage(T.pingQueued);
          return;
        }

        await trpcClient.statusPings.submit.mutate(input);
        await latestPingQuery.refetch();
        await haptics.success();
        setMessage(T.pingSuccess);
      } catch (error) {
        await haptics.error();
        setMessage(getErrorMessage(error, "Hindi naipadala ang status. Subukan muli."));
      } finally {
        setSubmittingStatus(null);
      }
    },
    [enqueue, latestPingQuery],
  );

  const lastStatusText = useMemo(() => {
    if (!latestPingQuery.data) {
      return "Last status: Wala pa";
    }

    return `Last status: ${formatPingStatus(latestPingQuery.data.status)} • ${formatRelativeTime(
      latestPingQuery.data.pinged_at,
    )}`;
  }, [latestPingQuery.data]);

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6 pb-8 pt-6">
          <View className="gap-4">
            <Text className="text-sm font-semibold uppercase tracking-[3px] text-emerald-700">
              Quick status
            </Text>
            <Text className="text-center text-base text-slate-700">{lastStatusText}</Text>
            <OfflineBanner isOnline={connectivity.isOnline} queueSize={queueSize} />
            {queueSize > 0 ? (
              <Text className="text-center text-sm text-slate-500">
                {queueSize} queued update(s) {isFlushing ? "syncing now" : T.queuedWaiting}
              </Text>
            ) : null}
          </View>

          <View className="mt-10 gap-5">
            <Pressable
              accessibilityRole="button"
              className="min-h-20 items-center justify-center rounded-[28px] bg-[#00A86B] px-6 py-7"
              onPress={() => void submitStatus("safe")}
            >
              <Text className="text-2xl font-semibold text-white">
                {submittingStatus === "safe" ? "Nagpapadala..." : "Ligtas Ako"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              className="min-h-20 items-center justify-center rounded-[28px] bg-[#D63031] px-6 py-7"
              onPress={() => void submitStatus("need_help")}
            >
              <Text className="text-2xl font-semibold text-white">
                {submittingStatus === "need_help" ? "Nagpapadala..." : "Kailangan ko ng Tulong"}
              </Text>
            </Pressable>
          </View>

          <Pressable className="mt-6" onPress={() => bottomSheetRef.current?.snapToIndex(1)}>
            <Text className="text-center text-sm font-medium text-slate-600">{T.crossPing}</Text>
          </Pressable>

          {message ? (
            <Text className="mt-6 rounded-2xl bg-white px-4 py-3 text-center text-sm text-slate-700">
              {message}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <CrossPingSheet
        bottomSheetRef={bottomSheetRef}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        searching={searching}
        selectedHousehold={selectedHousehold}
        onHouseholdPress={setSelectedHousehold}
        onSubmitStatus={(status, householdId) => {
          void submitStatus(status, householdId);
        }}
      />
    </>
  );
});
