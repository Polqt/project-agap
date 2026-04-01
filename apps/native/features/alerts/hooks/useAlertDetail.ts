import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { Share } from "react-native";
import { useState } from "react";

import { trpc } from "@/services/trpc";
import { getErrorMessage } from "@/shared/utils/errors";

import { buildAlertShareMessage, getAlertCopy } from "../utils";
import type { AlertLanguage } from "../types";

export function useAlertDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const [language, setLanguage] = useState<AlertLanguage>("english");
  const [feedback, setFeedback] = useState<string | null>(null);

  const alertQuery = useQuery(
    trpc.alerts.getById.queryOptions(
      { id: params.id ?? "" },
      {
        enabled: Boolean(params.id),
      },
    ),
  );

  const alert = alertQuery.data ?? null;
  const alertCopy = alert ? getAlertCopy(alert, language) : null;

  async function shareAlert() {
    if (!alert) {
      return;
    }

    try {
      await Share.share({
        message: buildAlertShareMessage(alert, language),
        title: alertCopy?.title,
      });
      setFeedback(null);
    } catch (error) {
      setFeedback(getErrorMessage(error, "Unable to share this alert right now."));
    }
  }

  async function openSourceUrl() {
    if (!alert?.source_url) {
      return;
    }

    try {
      const supported = await Linking.canOpenURL(alert.source_url);

      if (!supported) {
        setFeedback("This alert source link could not be opened on your device.");
        return;
      }

      await Linking.openURL(alert.source_url);
      setFeedback(null);
    } catch (error) {
      setFeedback(getErrorMessage(error, "Unable to open the alert source link."));
    }
  }

  return {
    alertId: params.id ?? null,
    alert,
    alertCopy,
    isLoading: alertQuery.isLoading,
    isRefreshing: alertQuery.isFetching && !alertQuery.isLoading,
    isError: alertQuery.isError,
    errorMessage: alertQuery.error ? getErrorMessage(alertQuery.error, "Unable to load alert details.") : null,
    language,
    setLanguage,
    feedback,
    refreshAlert: alertQuery.refetch,
    shareAlert,
    openSourceUrl,
  };
}
