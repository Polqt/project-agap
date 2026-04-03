import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Constants from "expo-constants";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { getResidentMapCache, setResidentMapCache } from "@/services/mapCache";
import { trpc } from "@/services/trpc";
import { formatDistanceKm, haversineDistanceKm } from "@/shared/utils/geo";
import type { CachedResidentMapData } from "@/types/map";
import type { EvacuationCenter } from "@project-agap/api/supabase";

type ReactNativeMapsModule = typeof import("react-native-maps");

const FALLBACK_REGION = {
  latitude: 10.7036,
  longitude: 122.9501,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

function getReactNativeMapsModule() {
  if (isExpoGo()) return null;
  try {
    return require("react-native-maps") as ReactNativeMapsModule;
  } catch {
    return null;
  }
}

export function EvacuationMap() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isOnline } = useOfflineQueue();
  const { location } = useCurrentLocation(Boolean(profile?.barangay_id));
  const [cachedData, setCachedData] = useState<CachedResidentMapData | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<EvacuationCenter | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
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
    if (!profile?.barangay_id) return;
    void getResidentMapCache(profile.barangay_id).then(setCachedData);
  }, [profile?.barangay_id]);

  useEffect(() => {
    if (!profile?.barangay_id || !centersQuery.data || !routesQuery.data) return;
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
    return [...centers].sort((a, b) => {
      const da = location
        ? haversineDistanceKm(location.latitude, location.longitude, a.latitude, a.longitude)
        : Number.MAX_SAFE_INTEGER;
      const db = location
        ? haversineDistanceKm(location.latitude, location.longitude, b.latitude, b.longitude)
        : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [centers, location]);

  const region = {
    latitude: location?.latitude ?? sortedCenters[0]?.latitude ?? FALLBACK_REGION.latitude,
    longitude: location?.longitude ?? sortedCenters[0]?.longitude ?? FALLBACK_REGION.longitude,
    latitudeDelta: FALLBACK_REGION.latitudeDelta,
    longitudeDelta: FALLBACK_REGION.longitudeDelta,
  };

  const handleMarkerPress = useCallback(
    (center: EvacuationCenter) => {
      setSelectedCenter(center);
      bottomSheetRef.current?.snapToIndex(0);
    },
    [],
  );

  const MapView = mapsModule?.default;
  const Marker = mapsModule?.Marker;
  const Polyline = mapsModule?.Polyline;

  const selectedDistance =
    selectedCenter && location
      ? haversineDistanceKm(
          location.latitude,
          location.longitude,
          selectedCenter.latitude,
          selectedCenter.longitude,
        )
      : null;

  return (
    <View className="flex-1 bg-slate-900">
      {/* Full-bleed map */}
      {MapView && Marker && Polyline ? (
        <MapView className="flex-1" initialRegion={region}>
          {location ? (
            <Marker coordinate={location} title="You" pinColor="#2563eb" />
          ) : null}
          {sortedCenters.map((center) => (
            <Marker
              key={center.id}
              coordinate={{ latitude: center.latitude, longitude: center.longitude }}
              title={center.name}
              description={center.is_open ? "Open" : "Closed"}
              pinColor={center.is_open ? "#16a34a" : "#dc2626"}
              onPress={() => handleMarkerPress(center)}
            />
          ))}
          {routes.map((route) => {
            const coords = Array.isArray(
              (route.route_geojson as { coordinates?: unknown[] }).coordinates,
            )
              ? (
                  (route.route_geojson as { coordinates: [number, number][] }).coordinates ?? []
                ).map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
              : [];
            if (!coords.length) return null;
            return (
              <Polyline
                key={route.id}
                coordinates={coords}
                strokeColor={route.color_hex || "#1d4ed8"}
                strokeWidth={4}
              />
            );
          })}
        </MapView>
      ) : (
        <View className="flex-1 items-center justify-center bg-slate-100 px-8">
          <Ionicons name="map-outline" size={48} color="#94a3b8" />
          <Text className="mt-4 text-center text-[15px] font-medium text-slate-500">
            Map unavailable in Expo Go
          </Text>
          <Text className="mt-1 text-center text-[13px] text-slate-400">
            Use a development build. Center list available below.
          </Text>
        </View>
      )}

      {/* Top bar overlay: Offline pill */}
      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
        pointerEvents="box-none"
      >
        <View className="flex-row items-center gap-2">
          {!isOnline ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5">
              <View className="h-2 w-2 rounded-full bg-amber-500" />
              <Text className="text-[11px] font-semibold text-amber-800">Offline</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push("/(resident)/profile")}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm"
        >
          <Ionicons name="person-outline" size={18} color="#334155" />
        </Pressable>
      </View>

      {/* FAB: Check-In shortcut */}
      <View
        className="absolute right-4"
        style={{ bottom: insets.bottom + 24 }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.push("/(resident)/checkin")}
          className="flex-row items-center gap-2 rounded-full bg-blue-700 px-5 py-3.5 shadow-lg active:bg-blue-800"
        >
          <Ionicons name="qr-code-outline" size={18} color="white" />
          <Text className="text-[14px] font-semibold text-white">Check-In</Text>
        </Pressable>
      </View>

      {/* Bottom sheet: Center detail */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["35%", "65%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 36 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {selectedCenter ? (
            <View className="gap-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[18px] font-bold text-slate-900">
                    {selectedCenter.name}
                  </Text>
                  <Text className="mt-1 text-[13px] text-slate-500">
                    {selectedCenter.address}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-3 py-1 ${
                    selectedCenter.is_open ? "bg-emerald-100" : "bg-rose-100"
                  }`}
                >
                  <Text
                    className={`text-[12px] font-semibold ${
                      selectedCenter.is_open ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {selectedCenter.is_open ? "Open" : "Closed"}
                  </Text>
                </View>
              </View>

              {selectedDistance != null ? (
                <Text className="text-[13px] text-slate-500">
                  {formatDistanceKm(selectedDistance)} away
                </Text>
              ) : null}

              {/* Capacity bar */}
              <View className="gap-2">
                <Text className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                  Capacity
                </Text>
                <View className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <View
                    className={`h-full rounded-full ${
                      selectedCenter.current_occupancy / selectedCenter.capacity > 0.8
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (selectedCenter.current_occupancy / Math.max(1, selectedCenter.capacity)) * 100)}%`,
                    }}
                  />
                </View>
                <Text className="text-[13px] font-medium text-slate-700">
                  {selectedCenter.current_occupancy}/{selectedCenter.capacity}
                </Text>
              </View>

              {selectedCenter.contact_number ? (
                <View className="flex-row items-center gap-2">
                  <Ionicons name="call-outline" size={14} color="#64748b" />
                  <Text className="text-[13px] text-slate-600">{selectedCenter.contact_number}</Text>
                </View>
              ) : null}

              {selectedCenter.is_open ? (
                <Pressable
                  onPress={() => router.push("/(resident)/checkin")}
                  className="items-center rounded-xl bg-emerald-600 py-3.5 active:bg-emerald-700"
                >
                  <Text className="text-[15px] font-semibold text-white">Check in here</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text className="py-8 text-center text-[14px] text-slate-400">
              Tap a center pin to see details.
            </Text>
          )}

          {/* Center list fallback */}
          {!selectedCenter && sortedCenters.length > 0 ? (
            <View className="mt-2 gap-2">
              {sortedCenters.map((center) => {
                const dist = location
                  ? haversineDistanceKm(
                      location.latitude,
                      location.longitude,
                      center.latitude,
                      center.longitude,
                    )
                  : null;
                return (
                  <Pressable
                    key={center.id}
                    onPress={() => handleMarkerPress(center)}
                    className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                  >
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-slate-900">{center.name}</Text>
                      <Text className="text-[12px] text-slate-500">
                        {center.address}
                        {dist != null ? ` \u00b7 ${formatDistanceKm(dist)}` : ""}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2 py-0.5 ${
                        center.is_open ? "bg-emerald-100" : "bg-rose-100"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          center.is_open ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {center.is_open ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
