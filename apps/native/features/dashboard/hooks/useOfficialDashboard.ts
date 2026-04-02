import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";

import { buildCenterQrShareMessage } from "../services/centerQr";

export function useOfficialDashboard() {
  const { profile, signOut } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const summaryQuery = useQuery(
    trpc.dashboard.summary.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const unresolvedQuery = useQuery(
    trpc.statusPings.listUnresolved.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const unaccountedQuery = useQuery(
    trpc.households.getUnaccounted.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const welfareDispatchQuery = useQuery(
    trpc.households.listWelfareDispatchQueue.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      {
        enabled: Boolean(profile?.barangay_id),
        refetchInterval: 60_000,
      },
    ),
  );

  const resolveMutation = useMutation(
    trpc.statusPings.resolve.mutationOptions({
      onSuccess: () => {
        void unresolvedQuery.refetch();
        void summaryQuery.refetch();
      },
    }),
  );

  const toggleCenterMutation = useMutation(
    trpc.evacuationCenters.toggleOpen.mutationOptions({
      onSuccess: () => {
        void centersQuery.refetch();
        setFeedback("Center availability updated.");
      },
    }),
  );

  const rotateQrMutation = useMutation(
    trpc.evacuationCenters.rotateQrToken.mutationOptions({
      onSuccess: () => {
        void centersQuery.refetch();
        setFeedback("Center check-in token rotated.");
      },
    }),
  );

  async function copyCenterToken(centerId: string) {
    const center = centersQuery.data?.find((entry) => entry.id === centerId);

    if (!center?.qr_code_token) {
      setFeedback("This center does not have a check-in token yet.");
      return;
    }

    await Clipboard.setStringAsync(center.qr_code_token);
    setFeedback("Center check-in token copied.");
  }

  async function shareCenterToken(centerId: string) {
    const center = centersQuery.data?.find((entry) => entry.id === centerId);

    if (!center) {
      setFeedback("Center details are unavailable right now.");
      return;
    }

    await Share.share({
      title: `${center.name} check-in token`,
      message: buildCenterQrShareMessage(center),
    });
  }

  return {
    signOut,
    feedback,
    summary: summaryQuery.data,
    unresolvedPings: unresolvedQuery.data ?? [],
    centers: centersQuery.data ?? [],
    unaccountedHouseholds: unaccountedQuery.data ?? [],
    welfareDispatch: welfareDispatchQuery.data ?? [],
    resolveMutation,
    toggleCenterMutation,
    rotateQrMutation,
    copyCenterToken,
    shareCenterToken,
  };
}
