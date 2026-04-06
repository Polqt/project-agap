import { env } from "@project-agap/env/native";

import type { OfflineMapPack, OfflineTilePack, OfflineTileStrategy } from "@/types/map";

export function getConfiguredOfflineTilePack(): OfflineTilePack | null {
  if (!env.EXPO_PUBLIC_OFFLINE_TILE_TEMPLATE) {
    return null;
  }

  return {
    pathTemplate: env.EXPO_PUBLIC_OFFLINE_TILE_TEMPLATE,
    label: env.EXPO_PUBLIC_OFFLINE_TILE_PACK_LABEL ?? "Offline tile pack",
    version: env.EXPO_PUBLIC_OFFLINE_TILE_PACK_VERSION ?? null,
    tileSize: env.EXPO_PUBLIC_OFFLINE_TILE_SIZE ?? 256,
    configuredAt: Date.now(),
  };
}

export function resolveOfflineTileStrategy(params: {
  mapPack: OfflineMapPack | null | undefined;
  supportsNativeMap: boolean;
  isOnline: boolean;
}) {
  const { mapPack, supportsNativeMap, isOnline } = params;

  if (supportsNativeMap && mapPack?.tilePack) {
    return {
      kind: "local-tiles",
      tilePack: mapPack.tilePack,
      summary: mapPack.tilePack.version
        ? `${mapPack.tilePack.label} pack ${mapPack.tilePack.version} is ready for offline basemap rendering.`
        : `${mapPack.tilePack.label} is ready for offline basemap rendering.`,
    } satisfies OfflineTileStrategy;
  }

  if (isOnline) {
    return {
      kind: "remote-preview",
      summary: "No local tile pack is configured yet, so the screen may use a remote preview while the live map boots.",
    } satisfies OfflineTileStrategy;
  }

  return {
    kind: "vector-fallback",
    summary: "No local tile pack is configured, so the app is using center markers, seeded routes, and cached alerts without a basemap.",
  } satisfies OfflineTileStrategy;
}
