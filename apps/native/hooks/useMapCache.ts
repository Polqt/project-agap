import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback } from "react";

import type { EvacuationCenter, EvacuationRoute } from "@project-agap/api/supabase";

function getCentersKey(barangayId: string) {
  return `agap:centers:${barangayId}`;
}

function getRoutesKey(barangayId: string) {
  return `agap:routes:${barangayId}`;
}

export function useMapCache(barangayId?: string | null) {
  const loadCenters = useCallback(async () => {
    if (!barangayId) {
      return [];
    }

    const value = await AsyncStorage.getItem(getCentersKey(barangayId));
    return value ? (JSON.parse(value) as EvacuationCenter[]) : [];
  }, [barangayId]);

  const loadRoutes = useCallback(async () => {
    if (!barangayId) {
      return [];
    }

    const value = await AsyncStorage.getItem(getRoutesKey(barangayId));
    return value ? (JSON.parse(value) as EvacuationRoute[]) : [];
  }, [barangayId]);

  const saveCenters = useCallback(
    async (centers: EvacuationCenter[]) => {
      if (!barangayId) {
        return;
      }

      await AsyncStorage.setItem(getCentersKey(barangayId), JSON.stringify(centers));
    },
    [barangayId],
  );

  const saveRoutes = useCallback(
    async (routes: EvacuationRoute[]) => {
      if (!barangayId) {
        return;
      }

      await AsyncStorage.setItem(getRoutesKey(barangayId), JSON.stringify(routes));
    },
    [barangayId],
  );

  return {
    loadCenters,
    loadRoutes,
    saveCenters,
    saveRoutes,
  };
}
