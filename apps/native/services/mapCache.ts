import AsyncStorage from "@react-native-async-storage/async-storage";

import type { OfflineMapPack } from "@/types/map";

function getMapPackCacheKey(barangayId: string) {
  return `agap-map-pack:${barangayId}`;
}

export async function getOfflineMapPack(barangayId: string) {
  const rawValue = await AsyncStorage.getItem(getMapPackCacheKey(barangayId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<OfflineMapPack>;
    return {
      barangayId,
      centers: parsedValue.centers ?? [],
      routes: parsedValue.routes ?? [],
      alerts: parsedValue.alerts ?? [],
      tilePack: parsedValue.tilePack ?? null,
      updatedAt: parsedValue.updatedAt ?? 0,
    } satisfies OfflineMapPack;
  } catch {
    return null;
  }
}

export async function saveOfflineMapPack(value: OfflineMapPack) {
  await AsyncStorage.setItem(getMapPackCacheKey(value.barangayId), JSON.stringify(value));
}

export async function clearOfflineMapPack(barangayId: string) {
  await AsyncStorage.removeItem(getMapPackCacheKey(barangayId));
}
