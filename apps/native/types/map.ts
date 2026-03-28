import type { EvacuationCenter, EvacuationRoute } from "@project-agap/api/supabase";

export type LocationPoint = {
  latitude: number;
  longitude: number;
};

export type CachedResidentMapData = {
  barangayId: string;
  centers: EvacuationCenter[];
  routes: EvacuationRoute[];
  updatedAt: number;
};
