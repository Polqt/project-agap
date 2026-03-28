import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Share } from "react-native";
import { useState } from "react";

import { trpc } from "@/services/trpc";

import { buildAlertShareMessage, getAlertCopy } from "../utils";
import type { AlertLanguage } from "../types";

export function useAlertDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const [language, setLanguage] = useState<AlertLanguage>("english");

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

    await Share.share({
      message: buildAlertShareMessage(alert, language),
      title: alertCopy?.title,
    });
  }

  return {
    alertId: params.id ?? null,
    alert,
    alertCopy,
    isLoading: alertQuery.isLoading,
    language,
    setLanguage,
    shareAlert,
  };
}
