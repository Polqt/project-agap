import type { EvacuationCenter, EvacuationRoute } from "@project-agap/api/supabase";

import BottomSheet from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";

import { EmptyState } from "@/components/app/empty-state";
import { SectionCard } from "@/components/app/section-card";
import { CenterInfoSheet } from "@/components/features/map/CenterInfoSheet";
import { getHaversineDistanceMeters } from "@/hooks/useHaversineDistance";
import { useMapCache } from "@/hooks/useMapCache";
import { useAuth } from "@/providers/AuthProvider";
import { haptics } from "@/services/haptics";
import { trpc } from "@/utils/trpc";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type CenterWithDistance = EvacuationCenter & {
  distanceMeters: number | null;
};

export function EvacuationMap() {
  const { profile } = useAuth();
  const mapRef = useRef<MapView | null>(null);
  const bottomSheetRef = useRef<BottomSheet | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [cachedCenters, setCachedCenters] = useState<EvacuationCenter[]>([]);
  const [cachedRoutes, setCachedRoutes] = useState<EvacuationRoute[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const mapCache = useMapCache(profile?.barangay_id);

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      {
        barangayId: profile?.barangay_id ?? "",
      },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );
  const routesQuery = useQuery(
    trpc.evacuationRoutes.listByBarangay.queryOptions(
      {
        barangayId: profile?.barangay_id ?? "",
      },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  useEffect(() => {
    async function loadLocationAndCache() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }

      const [centers, routes] = await Promise.all([mapCache.loadCenters(), mapCache.loadRoutes()]);
      setCachedCenters(centers);
      setCachedRoutes(routes);
    }

    void loadLocationAndCache();
  }, [mapCache]);

  useEffect(() => {
    if (centersQuery.data) {
      void mapCache.saveCenters(centersQuery.data);
    }
  }, [centersQuery.data, mapCache]);

  useEffect(() => {
    if (routesQuery.data) {
      void mapCache.saveRoutes(routesQuery.data);
    }
  }, [mapCache, routesQuery.data]);

  const centers = centersQuery.data ?? cachedCenters;
  const routes = routesQuery.data ?? cachedRoutes;

  const centersWithDistance = useMemo<CenterWithDistance[]>(
    () =>
      [...centers]
        .map((center) => ({
          ...center,
          distanceMeters: getHaversineDistanceMeters(currentLocation, {
            latitude: center.latitude,
            longitude: center.longitude,
          }),
        }))
        .sort(
          (left, right) =>
            (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
            (right.distanceMeters ?? Number.MAX_SAFE_INTEGER),
        ),
    [centers, currentLocation],
  );

  const selectedCenter =
    centersWithDistance.find((center) => center.id === selectedCenterId) ?? centersWithDistance[0] ?? null;

  const initialRegion = useMemo(() => {
    if (currentLocation) {
      return {
        ...currentLocation,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      };
    }

    const center = centersWithDistance[0];
    if (!center) {
      return undefined;
    }

    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };
  }, [centersWithDistance, currentLocation]);

  const handleCenterPress = useCallback((center: CenterWithDistance) => {
    setSelectedCenterId(center.id);
    bottomSheetRef.current?.snapToIndex(1);
    mapRef.current?.animateToRegion({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
    });
  }, []);

  if (!profile?.barangay_id) {
    return (
      <View className="flex-1 px-6 py-6">
        <EmptyState
          title="No barangay yet"
          description="Tap Profile later to finish your resident setup and attach your account to a barangay."
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="absolute left-0 right-0 top-0 z-10 px-4 pt-3">
        <SectionCard
          title="Evacuation map"
          description="Nearest centers appear first. Routes stay available from cached data when the connection drops."
          accentClassName="bg-white/95"
        >
          <Text className="text-sm text-slate-600">
            {centersQuery.isFetching || routesQuery.isFetching
              ? "Refreshing live map data..."
              : "Map is ready for navigation."}
          </Text>
        </SectionCard>
      </View>

      {initialRegion ? (
        <MapView
          ref={mapRef}
          className="flex-1"
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          <UrlTile flipY={false} maximumZ={19} urlTemplate={TILE_URL} />
          {routes.map((route) => (
            <Polyline
              key={route.id}
              coordinates={route.route_geojson.coordinates.map(([longitude, latitude]) => ({
                latitude,
                longitude,
              }))}
              strokeColor={route.color_hex}
              strokeWidth={4}
            />
          ))}
          {centersWithDistance.map((center) => (
            <Marker
              key={center.id}
              coordinate={{
                latitude: center.latitude,
                longitude: center.longitude,
              }}
              pinColor={center.is_open ? "#00A86B" : "#D63031"}
              title={center.name}
              description={center.address}
              onPress={() => handleCenterPress(center)}
            />
          ))}
        </MapView>
      ) : (
        <View className="flex-1 items-center justify-center bg-slate-200">
          <Text className="text-sm text-slate-600">Kinukuha ang mapa...</Text>
        </View>
      )}

      <CenterInfoSheet
        bottomSheetRef={bottomSheetRef}
        centers={centersWithDistance}
        selectedCenter={selectedCenter}
        onCenterPress={handleCenterPress}
        onCheckIn={(centerId) => {
          void haptics.light();
          router.push({
            pathname: "/(shared)/check-in",
            params: { centerId, mode: "manual" },
          });
        }}
      />
    </View>
  );
}
