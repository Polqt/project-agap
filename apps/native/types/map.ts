import type { Alert, EvacuationCenter, EvacuationRoute } from "@project-agap/api/supabase";

export type LocationPoint = {
  latitude: number;
  longitude: number;
};

export type OfflineTilePack = {
  pathTemplate: string;
  label: string;
  version: string | null;
  tileSize: number;
  configuredAt: number;
};

export type OfflineMapPack = {
  barangayId: string;
  centers: EvacuationCenter[];
  routes: EvacuationRoute[];
  alerts: Alert[];
  tilePack: OfflineTilePack | null;
  updatedAt: number;
};

export type OfflineTileStrategy =
  | {
      kind: "local-tiles";
      tilePack: OfflineTilePack;
      summary: string;
    }
  | {
      kind: "vector-fallback";
      summary: string;
    }
  | {
      kind: "remote-preview";
      summary: string;
    };

export type CachedResidentMapData = OfflineMapPack;
