import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/shared/hooks/useAuth";
import { useCurrentLocation } from "@/shared/hooks/useCurrentLocation";
import { queryClient, trpc } from "@/services/trpc";
import { getErrorMessage } from "@/shared/utils/errors";
import type { LocationPoint } from "@/types/map";

import { useEvacuationNavigation } from "../hooks/useEvacuationNavigation";
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
  const { location, error: locationError } = useCurrentLocation(Boolean(profile?.barangay_id));
  const [isNativeMapReady, setIsNativeMapReady] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<LocationPoint | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const mapsModule = useMemo(() => getReactNativeMapsModule(), []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<any>(null);

  const routesQuery = useQuery(
    trpc.evacuationRoutes.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

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

  const origin = pinnedLocation ?? location ?? null;
  const navigation = useEvacuationNavigation({
    barangayId: profile?.barangay_id,
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

  const MapViewComponent = mapsModule?.default;
  const MarkerComponent = mapsModule?.Marker;
  const PolylineComponent = mapsModule?.Polyline;

  async function persistPinnedLocation(nextPin: LocationPoint) {
    setPinnedLocation(nextPin);

    try {
      await setPinnedLocationMutation.mutateAsync(nextPin);
      await pinnedLocationQuery.refetch();
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
      await clearPinnedLocationMutation.mutateAsync();
      await pinnedLocationQuery.refetch();
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

  function handleZoom(multiplier: number) {
    const currentRegion = mapRef.current?.__lastRegion ?? region;

    mapRef.current?.animateToRegion(
      {
        ...currentRegion,
        latitudeDelta: Math.max(0.0015, currentRegion.latitudeDelta * multiplier),
        longitudeDelta: Math.max(0.0015, currentRegion.longitudeDelta * multiplier),
      },
      250,
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      {MapViewComponent && MarkerComponent && PolylineComponent ? (
        <View className="flex-1">
          {!isNativeMapReady ? (
            <Image
              source={{ uri: staticMapPreviewUrl }}
              className="absolute inset-0 h-full w-full"
              resizeMode="cover"
            />
          ) : null}

          <MapViewComponent
            ref={mapRef}
            style={{ flex: 1, opacity: isNativeMapReady ? 1 : 0 }}
            initialRegion={region}
            mapType={mapType}
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
                description={route.center.address}
                onPress={() => handleSelectCenter(route.center.id)}
              >
                <DestinationMarker
                  route={route}
                  isSelected={selectedRoute?.center.id === route.center.id}
                />
              </MarkerComponent>
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
              icon="add"
              onPress={() => handleZoom(0.6)}
              disabled={!origin}
            />
            <FloatingIconButton
              icon="remove"
              onPress={() => handleZoom(1.5)}
              disabled={!origin}
            />
            <FloatingIconButton
              icon="locate"
              onPress={handleRecenter}
              disabled={!origin}
            />
            <FloatingIconButton
              icon={mapType === "standard" ? "layers" : "map"}
              onPress={() => setMapType((current) => (current === "standard" ? "satellite" : "standard"))}
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
          <Image source={{ uri: staticMapPreviewUrl }} className="h-full w-full" resizeMode="cover" />
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

function DestinationMarker({
  route,
  isSelected,
}: {
  route: RankedEvacuationRoute;
  isSelected: boolean;
}) {
  const status = getCenterAvailabilityLabel(route.center.currentOccupancy, route.center.capacity);
  const fillColor = isSelected ? "#2563eb" : status.color;

  return (
    <View className="items-center">
      <View
        className="min-w-10 items-center rounded-2xl border-2 border-white px-3 py-2 shadow-lg"
        style={{ backgroundColor: fillColor }}
      >
        <Text className="text-base font-bold text-white">{route.rank}</Text>
      </View>
      <View className="mt-2 rounded-2xl bg-white/95 px-3 py-2 shadow">
        <Text className="text-xs font-semibold text-slate-900">{route.center.name}</Text>
        <Text className="mt-0.5 text-[11px] font-medium" style={{ color: fillColor }}>
          {status.label}
        </Text>
      </View>
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
    return "No open evacuation centers with route guidance are available right now.";
  }

  if (params.navigationError) {
    return "Live traffic-aware routing failed, so the app may fall back to cached road guidance.";
  }

  return null;
}
