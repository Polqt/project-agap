import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CachedResidentMapData } from "@/types/map";

function getResidentMapCacheKey(barangayId: string) {
  return `agap-map-cache:${barangayId}`;
}

export async function getResidentMapCache(barangayId: string) {
  const rawValue = await AsyncStorage.getItem(getResidentMapCacheKey(barangayId));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as CachedResidentMapData;
  } catch {
    return null;
  }
}

export async function setResidentMapCache(value: CachedResidentMapData) {
  await AsyncStorage.setItem(getResidentMapCacheKey(value.barangayId), JSON.stringify(value));
}
