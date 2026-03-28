import Constants from "expo-constants";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { getResidentMapCache, setResidentMapCache } from "@/services/mapCache";
import { trpc } from "@/services/trpc";
import { formatDistanceKm, haversineDistanceKm } from "@/shared/utils/geo";
import type { CachedResidentMapData } from "@/types/map";

type ReactNativeMapsModule = typeof import("react-native-maps");

const FALLBACK_REGION = {
  latitude: 10.7202,
  longitude: 122.5621,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

function getReactNativeMapsModule() {
  if (isExpoGo()) {
    return null;
  }

  try {
    return require("react-native-maps") as ReactNativeMapsModule;
  } catch {
    return null;
  }
}

export function EvacuationMap() {
  const router = useRouter();
  const { profile } = useAuth();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const [cachedData, setCachedData] = useState<CachedResidentMapData | null>(null);
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

  const region = {
    latitude: location?.latitude ?? sortedCenters[0]?.latitude ?? FALLBACK_REGION.latitude,
    longitude: location?.longitude ?? sortedCenters[0]?.longitude ?? FALLBACK_REGION.longitude,
    latitudeDelta: FALLBACK_REGION.latitudeDelta,
    longitudeDelta: FALLBACK_REGION.longitudeDelta,
  };

  const MapViewComponent = mapsModule?.default;
  const MarkerComponent = mapsModule?.Marker;
  const PolylineComponent = mapsModule?.Polyline;

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
            : "Live center and route data for your barangay."
        }
      >
        {MapViewComponent && MarkerComponent && PolylineComponent ? (
          <View className="h-96 overflow-hidden rounded-3xl">
            <MapViewComponent className="flex-1" initialRegion={region}>
              {location ? (
                <MarkerComponent coordinate={location} title="Your location" pinColor="#2563eb" />
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
          </View>
        ) : (
          <EmptyState
            title="Map preview unavailable in Expo Go"
            description="Use a development build to view the interactive map. The center list below still works for navigation and check-in."
          />
        )}
      </SectionCard>

      <SectionCard title="Center list" subtitle="Sorted by distance when location is available.">
        {sortedCenters.length ? (
          sortedCenters.map((center) => {
            const distance = location
              ? haversineDistanceKm(location.latitude, location.longitude, center.latitude, center.longitude)
              : null;

            return (
              <View key={center.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-slate-950">{center.name}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{center.address}</Text>
                    <Text className="mt-2 text-sm text-slate-600">{formatDistanceKm(distance)}</Text>
                  </View>
                  <Pill label={center.is_open ? "Open" : "Closed"} tone={center.is_open ? "success" : "warning"} />
                </View>
                <View className="mt-4">
                  <AppButton label="Open check-in" onPress={() => router.push("/check-in")} />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            title="No map data yet"
            description="Once your barangay publishes evacuation centers and routes, they will appear here."
          />
        )}
      </SectionCard>
    </View>
  );
}
