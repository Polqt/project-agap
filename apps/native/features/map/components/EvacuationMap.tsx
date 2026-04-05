import { useMutation, useQuery } from "@tanstack/react-query";
import { env } from "@project-agap/env/native";
import { useEffect, useMemo, useState } from "react";
import { Image, Platform, Text, View } from "react-native";

import { AppButton, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { getResidentMapCache, setResidentMapCache } from "@/services/mapCache";
import { queryClient, trpc } from "@/services/trpc";
import { getErrorMessage, getServerConnectionErrorMessage } from "@/shared/utils/errors";
import { haversineDistanceKm } from "@/shared/utils/geo";
import type { CachedResidentMapData, LocationPoint } from "@/types/map";

type ReactNativeMapsModule = typeof import("react-native-maps");

/** Barangay Banago focus (Avelino B. Torrecampo Memorial Hall area from pilot seed). */
const FALLBACK_REGION = {
  latitude: 10.7020,
  longitude: 122.9575,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

function getStaticMapUrl(latitude: number, longitude: number) {
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);

  // Yandex static maps endpoint is used here because it is reachable in this environment.
  return `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&size=650,350&z=16&l=map&pt=${lon},${lat},pm2rdm`;
}

function getReactNativeMapsModule() {
  // Keep static fallback on web where react-native-maps support is limited.
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
  const { profile } = useAuth();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const [cachedData, setCachedData] = useState<CachedResidentMapData | null>(null);
  const [isNativeMapReady, setIsNativeMapReady] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<LocationPoint | null>(null);
  const [pinSyncMessage, setPinSyncMessage] = useState<string | null>(null);
  const mapsModule = useMemo(() => getReactNativeMapsModule(), []);

  const routesQuery = useQuery(
    trpc.evacuationRoutes.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  useEffect(() => {
    if (!profile?.barangay_id) {
      return;
    }

    void getResidentMapCache(profile.barangay_id).then(setCachedData);
  }, [profile?.barangay_id]);

  useEffect(() => {
    if (!profile?.barangay_id || !centersQuery.data || !routesQuery.data) {
      return;
    }

    const nextCache: CachedResidentMapData = {
      barangayId: profile.barangay_id,
      centers: centersQuery.data,
      routes: routesQuery.data,
      updatedAt: Date.now(),
    };

    setCachedData(nextCache);
    void setResidentMapCache(nextCache);
  }, [centersQuery.data, profile?.barangay_id, routesQuery.data]);

  const pinnedLocationQueryKey = trpc.profile.getPinnedLocation.queryKey();
  const pinnedLocationQuery = useQuery(
    trpc.profile.getPinnedLocation.queryOptions(undefined, {
      enabled: Boolean(profile?.id),
    }),
  );

  const setPinnedLocationMutation = useMutation(
    trpc.profile.setPinnedLocation.mutationOptions({
      onSuccess: (result) => {
        queryClient.setQueryData(pinnedLocationQueryKey, result);
      },
    }),
  );

  const clearPinnedLocationMutation = useMutation(
    trpc.profile.clearPinnedLocation.mutationOptions({
      onSuccess: () => {
        queryClient.setQueryData(pinnedLocationQueryKey, null);
      },
    }),
  );

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

  const centers = centersQuery.data?.length ? centersQuery.data : cachedData?.centers ?? [];
  const routes = routesQuery.data?.length ? routesQuery.data : cachedData?.routes ?? [];

  const sortedCenters = useMemo(() => {
    return [...centers].sort((left, right) => {
      const leftDistance = location
        ? haversineDistanceKm(location.latitude, location.longitude, left.latitude, left.longitude)
        : Number.MAX_SAFE_INTEGER;
      const rightDistance = location
        ? haversineDistanceKm(location.latitude, location.longitude, right.latitude, right.longitude)
        : Number.MAX_SAFE_INTEGER;

      return leftDistance - rightDistance;
    });
  }, [centers, location]);

  const region = FALLBACK_REGION;
  const staticMapPreviewUrl = useMemo(
    () => getStaticMapUrl(region.latitude, region.longitude),
    [region.latitude, region.longitude],
  );

  const MapViewComponent = mapsModule?.default;
  const MarkerComponent = mapsModule?.Marker;
  const PolylineComponent = mapsModule?.Polyline;

  async function persistPinnedLocation(nextPin: LocationPoint) {
    setPinnedLocation(nextPin);
    setPinSyncMessage("Saving pin to server...");

    try {
      await setPinnedLocationMutation.mutateAsync(nextPin);
      await pinnedLocationQuery.refetch();
      setPinSyncMessage("Pinned location saved to backend.");
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Failed to save pin to backend.");
      if (errorMessage.toLowerCase().includes("network request failed")) {
        setPinSyncMessage(getServerConnectionErrorMessage("Unable to reach API for pin save."));
      } else {
        setPinSyncMessage(errorMessage);
      }
    }
  }

  function handlePinMyLocation() {
    if (!location) {
      return;
    }

    void persistPinnedLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    });
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
    setPinSyncMessage("Clearing pinned location on server...");

    try {
      await clearPinnedLocationMutation.mutateAsync();
      await pinnedLocationQuery.refetch();
      setPinSyncMessage("Pinned location cleared from backend.");
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Failed to clear pin on backend.");
      if (errorMessage.toLowerCase().includes("network request failed")) {
        setPinSyncMessage(getServerConnectionErrorMessage("Unable to reach API for pin clear."));
      } else {
        setPinSyncMessage(errorMessage);
      }
    }
  }

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.2.2 Evacuation map"
        title="Find the nearest open center"
        description="Map markers, route overlays, and cached center data stay visible even when connectivity gets weak."
      />

      <SectionCard
        title="Map"
        subtitle={
          cachedData && !centersQuery.data?.length
            ? "Showing cached center and route data."
            : "Live center and route data for your barangay. Long-press to pin and save your location."
        }
      >
        {MapViewComponent && MarkerComponent && PolylineComponent ? (
          <View className="h-[30rem] overflow-hidden rounded-3xl">
            {!isNativeMapReady ? (
              <Image
                source={{ uri: staticMapPreviewUrl }}
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
              />
            ) : null}
            <MapViewComponent
              style={{ flex: 1, opacity: isNativeMapReady ? 1 : 0 }}
              initialRegion={region}
              scrollEnabled
              zoomEnabled
              rotateEnabled
              pitchEnabled
              onMapReady={() => setIsNativeMapReady(true)}
              onLongPress={handleMapLongPress}
            >
              {location ? (
                <MarkerComponent coordinate={location} title="Your location" pinColor="#2563eb" />
              ) : null}
              {pinnedLocation ? (
                <MarkerComponent
                  coordinate={pinnedLocation}
                  title="Pinned location"
                  description="Drag to adjust or long-press map to move pin."
                  pinColor="#dc2626"
                  draggable
                  onDragEnd={handlePinnedDragEnd}
                />
              ) : null}
              {sortedCenters.map((center) => (
                <MarkerComponent
                  key={center.id}
                  coordinate={{ latitude: center.latitude, longitude: center.longitude }}
                  title={center.name}
                  description={center.address}
                  pinColor={center.is_open ? "#16a34a" : "#f59e0b"}
                />
              ))}
              {routes.map((route) => {
                const coordinates = Array.isArray((route.route_geojson as { coordinates?: unknown[] }).coordinates)
                  ? ((route.route_geojson as { coordinates: [number, number][] }).coordinates ?? []).map(
                      ([longitude, latitude]) => ({
                        latitude,
                        longitude,
                      }),
                    )
                  : [];

                if (!coordinates.length) {
                  return null;
                }

                return (
                  <PolylineComponent
                    key={route.id}
                    coordinates={coordinates}
                    strokeColor={route.color_hex || "#1d4ed8"}
                    strokeWidth={4}
                  />
                );
              })}
            </MapViewComponent>

            <View className="absolute bottom-3 left-3 right-3 gap-2">
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <AppButton
                    label={pinnedLocation ? "Move pin to my location" : "Pin my location"}
                    onPress={handlePinMyLocation}
                    variant="secondary"
                    disabled={!location || setPinnedLocationMutation.isPending || clearPinnedLocationMutation.isPending}
                    loading={setPinnedLocationMutation.isPending}
                  />
                </View>
                {pinnedLocation ? (
                  <View className="flex-1">
                    <AppButton
                      label="Clear pin"
                      onPress={() => {
                        void handleClearPin();
                      }}
                      variant="ghost"
                      loading={clearPinnedLocationMutation.isPending}
                      disabled={setPinnedLocationMutation.isPending || clearPinnedLocationMutation.isPending}
                    />
                  </View>
                ) : null}
              </View>
              <View className="rounded-2xl bg-white/90 px-3 py-2">
                <Text className="text-xs text-slate-700">
                  {pinSyncMessage ??
                    (pinnedLocationQuery.data
                      ? `Server pin: ${pinnedLocationQuery.data.latitude.toFixed(5)}, ${pinnedLocationQuery.data.longitude.toFixed(5)}`
                      : "Server pin: none")}
                </Text>
                <Text className="mt-1 text-[10px] text-slate-500">API: {env.EXPO_PUBLIC_SERVER_URL}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <Image
              source={{ uri: staticMapPreviewUrl }}
              className="h-[30rem] w-full rounded-3xl"
              resizeMode="cover"
            />
            <Text className="mt-3 text-sm text-slate-500">
              Pinning is available on the interactive mobile map. Long-press to drop a pin.
            </Text>
          </View>
        )}
      </SectionCard>

    </View>
  );
}
