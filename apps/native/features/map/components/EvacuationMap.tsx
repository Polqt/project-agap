import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import {
  getOfflinePinnedLocation,
  getOfflineScope,
  listOfflineEvacuationRoutes,
} from "@/services/offlineData";
import { getOfflineMapPack } from "@/services/mapCache";
import { readOfflineSyncTimestamp } from "@/services/offlineDataDb";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { getErrorMessage } from "@/shared/utils/errors";
import { getLatestSyncedTimestamp } from "@/shared/utils/offline-freshness";
import type { LocationPoint } from "@/types/map";
import { bumpOfflineDataGeneration, offlineDataStore } from "@/stores/offline-data-store";

import { useEvacuationNavigation } from "../hooks/useEvacuationNavigation";
import { resolveOfflineTileStrategy } from "../services/offlineTileStrategy";
import type { RankedEvacuationRoute } from "../types";
import { EvacuationCentersList } from "./EvacuationCentersList";

type ReactNativeMapsModule = typeof import("react-native-maps");

const FALLBACK_REGION = {
  latitude: 10.7042,
  longitude: 122.9511,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

function getStaticMapUrl(latitude: number, longitude: number) {
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);

  return `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&size=650,350&z=15&l=map&pt=${lon},${lat},pm2blm`;
}

function getReactNativeMapsModule() {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    return require("react-native-maps") as ReactNativeMapsModule;
  } catch {
    return null;
  }
}

export function EvacuationMap() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isOnline, queueAction } = useOfflineQueue();
  const offlineGeneration = useStore(offlineDataStore, (state) => state.generation);
  const { location, error: locationError } = useCurrentLocation(Boolean(profile?.barangay_id));
  const [isNativeMapReady, setIsNativeMapReady] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<LocationPoint | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const mapsModule = useMemo(() => getReactNativeMapsModule(), []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<any>(null);
  const offlineScope = getOfflineScope(profile);

  const routesQuery = useQuery({
    queryKey: ["offline", "map-routes", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => listOfflineEvacuationRoutes(offlineScope!.scopeId),
  });

  const syncTimestampQuery = useQuery({
    queryKey: ["offline", "map-sync-timestamp", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => {
      if (!offlineScope) {
        return null;
      }

      const timestamps = await Promise.all([
        readOfflineSyncTimestamp(offlineScope.scopeId, "evacuation-centers"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "evacuation-routes"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "alerts"),
        readOfflineSyncTimestamp(offlineScope.scopeId, "pinned-location"),
      ]);
      return getLatestSyncedTimestamp(...timestamps);
    },
  });

  const pinnedLocationQuery = useQuery({
    queryKey: ["offline", "map-pinned-location", offlineScope?.scopeId, offlineGeneration],
    enabled: Boolean(offlineScope?.scopeId),
    queryFn: async () => getOfflinePinnedLocation(offlineScope!.scopeId),
  });
  const mapPackQuery = useQuery({
    queryKey: ["offline", "map-pack", profile?.barangay_id, offlineGeneration],
    enabled: Boolean(profile?.barangay_id),
    queryFn: async () => getOfflineMapPack(profile!.barangay_id!),
  });

  const setPinnedLocationMutation = useMutation({});
  const clearPinnedLocationMutation = useMutation({});

  useEffect(() => {
    if (!pinnedLocationQuery.data) {
      return;
    }

    setPinnedLocation({
      latitude: pinnedLocationQuery.data.latitude,
      longitude: pinnedLocationQuery.data.longitude,
    });
  }, [pinnedLocationQuery.data]);

  useEffect(() => {
    if (pinnedLocationQuery.data === null) {
      setPinnedLocation(null);
    }
  }, [pinnedLocationQuery.data]);

  const origin = pinnedLocation ?? location ?? null;
  const navigation = useEvacuationNavigation({
    barangayId: profile?.barangay_id,
    offlineScopeId: offlineScope?.scopeId,
    cacheGeneration: offlineGeneration,
    origin,
    profilePurok: profile?.purok,
    fallbackRoutes: routesQuery.data ?? [],
    selectedCenterId,
  });

  useEffect(() => {
    const defaultRoute = navigation.rankedRoutes[0];

    if (!defaultRoute) {
      return;
    }

    if (!selectedCenterId || !navigation.rankedRoutes.some((route) => route.center.id === selectedCenterId)) {
      setSelectedCenterId(defaultRoute.center.id);
    }
  }, [navigation.rankedRoutes, selectedCenterId]);

  useEffect(() => {
    if (!isNativeMapReady || !navigation.selectedRoute || !mapRef.current) {
      return;
    }

    const routeCoordinates =
      navigation.selectedRoute.coordinates.length > 1
        ? navigation.selectedRoute.coordinates
        : [
            navigation.origin ?? origin,
            {
              latitude: navigation.selectedRoute.center.latitude,
              longitude: navigation.selectedRoute.center.longitude,
            },
          ].filter((coordinate): coordinate is LocationPoint => Boolean(coordinate));

    if (routeCoordinates.length < 2) {
      return;
    }

    mapRef.current.fitToCoordinates(routeCoordinates, {
      animated: true,
      edgePadding: {
        top: 160,
        right: 60,
        bottom: 360,
        left: 60,
      },
    });
  }, [isNativeMapReady, navigation.origin, navigation.selectedRoute, origin]);

  const region = useMemo(() => {
    if (!origin) {
      return FALLBACK_REGION;
    }

    return {
      latitude: origin.latitude,
      longitude: origin.longitude,
      latitudeDelta: 0.014,
      longitudeDelta: 0.014,
    };
  }, [origin]);

  const staticMapPreviewUrl = useMemo(
    () => getStaticMapUrl(region.latitude, region.longitude),
    [region.latitude, region.longitude],
  );

  const rankedRoutes = navigation.rankedRoutes;
  const selectedRoute = navigation.selectedRoute;
  const activePolyline = getActivePolyline(selectedRoute, origin);
  const routeArrows = useMemo(() => buildRouteArrowMarkers(activePolyline), [activePolyline]);
  const infoMessage = getInfoMessage({
    locationError,
    navigationError: navigation.error,
    hasOrigin: Boolean(origin),
    hasRoute: Boolean(selectedRoute),
  });
  const tileStrategy = useMemo(
    () =>
      resolveOfflineTileStrategy({
        mapPack: mapPackQuery.data,
        supportsNativeMap: Boolean(mapsModule?.default),
        isOnline,
      }),
    [isOnline, mapPackQuery.data, mapsModule],
  );
  const showRemotePreview =
    tileStrategy.kind === "remote-preview" && !isNativeMapReady && isOnline;

  const MapViewComponent = mapsModule?.default;
  const LocalTileComponent = mapsModule?.LocalTile;
  const MarkerComponent = mapsModule?.Marker;
  const PolylineComponent = mapsModule?.Polyline;
  const localTilePack = tileStrategy.kind === "local-tiles" ? tileStrategy.tilePack : null;
  const showLocalTiles = Boolean(localTilePack && LocalTileComponent);
  const effectiveMapType = showLocalTiles ? "none" : mapType;

  async function persistPinnedLocation(nextPin: LocationPoint) {
    setPinnedLocation(nextPin);

    try {
      await queueAction(createQueuedAction("profile.set-pinned-location", nextPin, offlineScope));
      bumpOfflineDataGeneration();
    } catch (error) {
      setPinnedLocation(
        pinnedLocationQuery.data
          ? {
              latitude: pinnedLocationQuery.data.latitude,
              longitude: pinnedLocationQuery.data.longitude,
            }
          : null,
      );
      console.warn(getErrorMessage(error, "Failed to save pin to backend."));
    }
  }

  function handlePinMyLocation() {
    if (!location) {
      return;
    }

    void persistPinnedLocation(location);
  }

  function handleMapLongPress(event: {
    nativeEvent: {
      coordinate: LocationPoint;
    };
  }) {
    void persistPinnedLocation(event.nativeEvent.coordinate);
  }

  function handlePinnedDragEnd(event: {
    nativeEvent: {
      coordinate: LocationPoint;
    };
  }) {
    void persistPinnedLocation(event.nativeEvent.coordinate);
  }

  async function handleClearPin() {
    setPinnedLocation(null);

    try {
      await queueAction(createQueuedAction("profile.clear-pinned-location", {}, offlineScope));
      bumpOfflineDataGeneration();
    } catch (error) {
      setPinnedLocation(
        pinnedLocationQuery.data
          ? {
              latitude: pinnedLocationQuery.data.latitude,
              longitude: pinnedLocationQuery.data.longitude,
            }
          : null,
      );
      console.warn(getErrorMessage(error, "Failed to clear pin on backend."));
    }
  }

  function handleSelectCenter(centerId: string) {
    setSelectedCenterId(centerId);
    bottomSheetRef.current?.snapToIndex(1);
  }

  function handleRecenter() {
    if (!origin) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      300,
    );
  }

return (
    <View className="flex-1 bg-slate-950">
      {MapViewComponent && MarkerComponent && PolylineComponent ? (
        <View className="flex-1">
          {showRemotePreview ? (
            <Image
              source={{ uri: staticMapPreviewUrl }}
              className="absolute inset-0 h-full w-full"
              resizeMode="cover"
            />
          ) : !isNativeMapReady ? (
            <OfflineMapPlaceholder summary={tileStrategy.summary} />
          ) : null}

          <MapViewComponent
            ref={mapRef}
            style={{ flex: 1, opacity: isNativeMapReady ? 1 : 0 }}
            initialRegion={region}
            mapType={effectiveMapType}
            onMapReady={() => setIsNativeMapReady(true)}
            onLongPress={handleMapLongPress}
            onRegionChangeComplete={(nextRegion: unknown) => {
              mapRef.current.__lastRegion = nextRegion;
            }}
            scrollEnabled
            zoomEnabled
            rotateEnabled
            pitchEnabled
          >
            {showLocalTiles && LocalTileComponent && localTilePack ? (
              <LocalTileComponent
                pathTemplate={localTilePack.pathTemplate}
                tileSize={localTilePack.tileSize}
              />
            ) : null}

            {origin ? (
              <MarkerComponent coordinate={origin} title="Your location">
                <UserLocationMarker isPinned={Boolean(pinnedLocation)} />
              </MarkerComponent>
            ) : null}

            {pinnedLocation ? (
              <MarkerComponent
                coordinate={pinnedLocation}
                title="Pinned home"
                draggable
                onDragEnd={handlePinnedDragEnd}
              />
            ) : null}

            {rankedRoutes.map((route) => (
              <MarkerComponent
                key={route.center.id}
                coordinate={{
                  latitude: route.center.latitude,
                  longitude: route.center.longitude,
                }}
                title={route.center.name}
                description={`${route.center.address} • ${getCenterAvailabilityLabel(route.center.currentOccupancy, route.center.capacity).label}`}
                pinColor={
                  selectedRoute?.center.id === route.center.id ? "#15803d" : "#22c55e"
                }
                onPress={() => handleSelectCenter(route.center.id)}
              />
            ))}

            {activePolyline.length > 1 ? (
              <>
                <PolylineComponent
                  coordinates={activePolyline}
                  strokeColor="#bfdbfe"
                  strokeWidth={14}
                  lineCap="round"
                  lineJoin="round"
                />
                <PolylineComponent
                  coordinates={activePolyline}
                  strokeColor="#2563eb"
                  strokeWidth={7}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            ) : null}

            {routeArrows.map((arrow, index) => (
              <MarkerComponent
                key={`${arrow.coordinate.latitude}-${arrow.coordinate.longitude}-${index}`}
                coordinate={arrow.coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View
                  style={{ transform: [{ rotate: `${arrow.bearing}deg` }] }}
                  className="rounded-full bg-white/95 px-1.5 py-1 shadow"
                >
                  <Ionicons name="arrow-forward" size={12} color="#1d4ed8" />
                </View>
              </MarkerComponent>
            ))}
          </MapViewComponent>

          {infoMessage ? (
            <View
              className="absolute left-4 right-20 rounded-3xl bg-white/95 px-4 py-4 shadow-lg"
              style={{ top: insets.top + 12 }}
            >
              <Text className="text-sm font-medium text-slate-700">{infoMessage}</Text>
            </View>
          ) : null}

          <View
            pointerEvents="box-none"
            className="absolute right-4 gap-3"
            style={{ top: insets.top + 14 }}
          >
            <FloatingIconButton
              icon="locate"
              onPress={handleRecenter}
              disabled={!origin}
            />
            <FloatingIconButton
              icon={showLocalTiles ? "map" : mapType === "standard" ? "layers" : "map"}
              onPress={() => setMapType((current) => (current === "standard" ? "satellite" : "standard"))}
              disabled={showLocalTiles}
            />
            {pinnedLocation ? (
              <FloatingIconButton
                icon="close"
                onPress={() => {
                  void handleClearPin();
                }}
                disabled={setPinnedLocationMutation.isPending || clearPinnedLocationMutation.isPending}
              />
            ) : null}
            {!pinnedLocation ? (
              <FloatingIconButton
                icon="pin"
                onPress={handlePinMyLocation}
                disabled={!location || setPinnedLocationMutation.isPending}
              />
            ) : null}
          </View>

          <EvacuationCentersList
            bottomSheetRef={bottomSheetRef}
            rankedRoutes={rankedRoutes}
            selectedCenterId={selectedCenterId}
            selectedRoute={selectedRoute}
            isLoading={navigation.isLoading || navigation.isFetching}
            errorMessage={
              navigation.error
                ? getErrorMessage(
                    navigation.error,
                    "We could not compute a live road route right now.",
                  )
                : null
            }
            onSelectCenter={handleSelectCenter}
          />

        </View>
      ) : (
        <View className="flex-1">
          {isOnline ? (
            <Image source={{ uri: staticMapPreviewUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <OfflineMapPlaceholder summary={tileStrategy.summary} />
          )}
          {infoMessage ? (
            <View
              className="absolute left-4 right-20 rounded-3xl bg-white/95 px-4 py-4 shadow-lg"
              style={{ top: insets.top + 12 }}
            >
              <Text className="text-sm font-medium text-slate-700">{infoMessage}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function OfflineMapPlaceholder({ summary }: { summary: string }) {
  return (
    <View className="absolute inset-0 bg-slate-900">
      <View className="absolute inset-0 opacity-20">
        <View className="flex-1 flex-row">
          <View className="flex-1 border-r border-white/10" />
          <View className="flex-1 border-r border-white/10" />
          <View className="flex-1" />
        </View>
        <View className="absolute inset-x-0 top-1/3 border-t border-white/10" />
        <View className="absolute inset-x-0 top-2/3 border-t border-white/10" />
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View className="rounded-3xl border border-white/10 bg-white/5 px-5 py-5">
          <Text className="text-center text-[18px] font-bold text-white">Offline map mode</Text>
          <Text className="mt-2 text-center text-[13px] leading-5 text-slate-300">
            {summary}
          </Text>
        </View>
      </View>
    </View>
  );
}


function UserLocationMarker({ isPinned }: { isPinned: boolean }) {
  return (
    <View className="items-center">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-200/70">
        <View className="h-5 w-5 rounded-full border-2 border-white bg-blue-600" />
      </View>
      <Text className="mt-2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700">
        {isPinned ? "Pinned home" : "Your location"}
      </Text>
    </View>
  );
}

function FloatingIconButton({
  icon,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-12 w-12 items-center justify-center rounded-full bg-white/94 shadow-lg ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Ionicons name={icon} size={20} color="#0f172a" />
    </Pressable>
  );
}

function getCenterAvailabilityLabel(currentOccupancy: number, capacity: number) {
  if (capacity <= 0) {
    return { label: "Unknown capacity", color: "#64748b" };
  }

  const ratio = currentOccupancy / capacity;

  if (ratio >= 1) {
    return { label: "Full", color: "#dc2626" };
  }

  if (ratio >= 0.85) {
    return { label: "Limited slots", color: "#d97706" };
  }

  return { label: "Available", color: "#059669" };
}


function getActivePolyline(
  selectedRoute: RankedEvacuationRoute | null,
  origin: LocationPoint | null,
) {
  if (!selectedRoute) {
    return [];
  }

  if (selectedRoute.coordinates.length > 1) {
    return selectedRoute.coordinates;
  }

  if (!origin) {
    return [];
  }

  return [
    origin,
    {
      latitude: selectedRoute.center.latitude,
      longitude: selectedRoute.center.longitude,
    },
  ];
}

function buildRouteArrowMarkers(coordinates: LocationPoint[]) {
  if (coordinates.length < 3) {
    return [];
  }

  return coordinates
    .slice(1, -1)
    .filter((_, index) => index % 3 === 1)
    .map((coordinate, index) => {
      const previous = coordinates[index];
      const next = coordinates[index + 2];

      return {
        coordinate,
        bearing: getSegmentBearing(previous, next),
      };
    });
}

function getSegmentBearing(start: LocationPoint, end: LocationPoint) {
  const deltaLongitude = end.longitude - start.longitude;
  const deltaLatitude = end.latitude - start.latitude;

  return (Math.atan2(deltaLongitude, deltaLatitude) * 180) / Math.PI;
}

function getInfoMessage(params: {
  locationError: string | null;
  navigationError: unknown;
  hasOrigin: boolean;
  hasRoute: boolean;
}) {
  if (!params.hasOrigin) {
    return params.locationError ?? "Allow location access or pin your home to start navigation.";
  }

  if (!params.hasRoute) {
    return null;
  }

  if (params.navigationError) {
    return "Live traffic-aware routing failed, so the app may fall back to cached road guidance.";
  }

  return null;
}
