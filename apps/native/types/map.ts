import type { Alert, EvacuationCenter, EvacuationRoute } from "@project-agap/api/supabase";

export type LocationPoint = {
  latitude: number;
  longitude: number;
};

export type OfflineMapPack = {
  barangayId: string;
  centers: EvacuationCenter[];
  routes: EvacuationRoute[];
  alerts: Alert[];
  updatedAt: number;
};

export type CachedResidentMapData = OfflineMapPack;
