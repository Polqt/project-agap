import AsyncStorage from "@react-native-async-storage/async-storage";
import { env } from "@project-agap/env/native";
import type { Alert, EvacuationRoute, NearbyCenter } from "@project-agap/api/supabase";

import { getOfflineMapPack } from "@/services/mapCache";
import { trpcClient } from "@/services/trpc";
import { listOfflineAlerts, listOfflineEvacuationCenters } from "@/services/offlineData";
import { shouldUseStaleCachedRoute } from "@/shared/utils/offline-freshness";
import { haversineDistanceKm } from "@/shared/utils/geo";
import type { LocationPoint } from "@/types/map";

import type {
  EvacuationCenterOption,
  EvacuationNavigationResult,
  RankedEvacuationRoute,
  RouteStep,
  RouteStepManeuver,
  RouteTravelMode,
} from "../types";

const ROUTE_CACHE_TTL_MS = 60_000;
const STALE_ROUTE_CACHE_TTL_MS = 24 * 60 * 60_000;
const ROUTE_CACHE_PREFIX = "agap-evacuation-route:";
const DEFAULT_RADIUS_KM = 10;
const MAX_CENTER_CANDIDATES = 3;

type GoogleDirectionsResponse = {
  routes?: Array<{
    summary?: string;
    overview_polyline?: { points?: string };
    legs?: Array<{
      distance?: { value?: number };
      duration?: { value?: number };
      duration_in_traffic?: { value?: number };
      steps?: Array<{
        html_instructions?: string;
        maneuver?: string;
        distance?: { value?: number };
        duration?: { value?: number };
      }>;
    }>;
  }>;
  status?: string;
  error_message?: string;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
    legs?: Array<{
      steps?: Array<{
        name?: string;
        distance?: number;
        duration?: number;
        maneuver?: {
          type?: string;
          modifier?: string;
        };
      }>;
    }>;
  }>;
};

type TrafficAwareCandidate = {
  coordinates: LocationPoint[];
  roadDistanceKm: number;
  drivingDurationMinutes: number | null;
  walkingDurationMinutes: number | null;
  predictedTrafficDelayMinutes: number | null;
  steps: RouteStep[];
  source: RankedEvacuationRoute["source"];
  notice: RankedEvacuationRoute["notice"];
};

type CachedRouteEnvelope = {
  cachedAt: number;
  route: RankedEvacuationRoute;
};

type CachedRouteReadResult = {
  route: RankedEvacuationRoute;
  isStale: boolean;
};

export async function buildEvacuationNavigation(params: {
  barangayId: string;
  offlineScopeId?: string | null;
  origin: LocationPoint;
  profilePurok?: string | null;
  fallbackRoutes: EvacuationRoute[];
}) {
  const { barangayId, offlineScopeId, origin, profilePurok, fallbackRoutes } = params;
  const mapPack = await getOfflineMapPack(barangayId);
  const [candidateCenters, activeAlerts] = await Promise.all([
    loadCandidateCenters({ barangayId, origin, offlineScopeId, mapPack }),
    loadActiveAlerts(barangayId, offlineScopeId, mapPack),
  ]);
  const resolvedFallbackRoutes = fallbackRoutes.length > 0 ? fallbackRoutes : (mapPack?.routes ?? []);

  const rankedRoutes = await Promise.all(
    candidateCenters.slice(0, MAX_CENTER_CANDIDATES).map((center) =>
      buildRankedRoute({
        center,
        origin,
        profilePurok,
        fallbackRoutes: resolvedFallbackRoutes,
        activeAlerts,
      }),
    ),
  );

  const sortedRoutes = rankedRoutes
    .sort((left, right) => {
      const leftScore = getRouteRecommendationScore(left);
      const rightScore = getRouteRecommendationScore(right);
      return leftScore - rightScore;
    })
    .map((route, index) => ({
      ...route,
      rank: index + 1,
    }));

  return {
    origin,
    rankedRoutes: sortedRoutes,
    generatedAt: Date.now(),
  } satisfies EvacuationNavigationResult;
}

async function loadCandidateCenters(params: {
  barangayId: string;
  offlineScopeId?: string | null;
  origin: LocationPoint;
  mapPack?: Awaited<ReturnType<typeof getOfflineMapPack>> | null;
}) {
  const { barangayId, offlineScopeId, origin, mapPack } = params;

  try {
    const nearbyCenters = await trpcClient.evacuationCenters.getNearby.query({
      barangayId,
      latitude: origin.latitude,
      longitude: origin.longitude,
      radiusKm: DEFAULT_RADIUS_KM,
    });

    if (nearbyCenters.length > 0) {
      return nearbyCenters.map(mapNearbyCenter);
    }
  } catch {
    // Fall back to listing the barangay centers and sorting locally.
  }

  let centers = await trpcClient.evacuationCenters.listByBarangay
    .query({ barangayId })
    .catch(async () => {
      if (mapPack?.centers.length) {
        return mapPack.centers;
      }

      return offlineScopeId ? await listOfflineEvacuationCenters(offlineScopeId) : [];
    });

  return centers
    .filter((center) => center.is_open)
    .map((center) => ({
      id: center.id,
      name: center.name,
      address: center.address,
      latitude: center.latitude,
      longitude: center.longitude,
      capacity: center.capacity,
      currentOccupancy: center.current_occupancy,
      isOpen: center.is_open,
      contactNumber: center.contact_number,
      notes: center.notes,
      straightLineDistanceKm: haversineDistanceKm(
        origin.latitude,
        origin.longitude,
        center.latitude,
        center.longitude,
      ),
    }))
    .sort((left, right) => left.straightLineDistanceKm - right.straightLineDistanceKm);
}

async function loadActiveAlerts(
  barangayId: string,
  offlineScopeId?: string | null,
  mapPack?: Awaited<ReturnType<typeof getOfflineMapPack>> | null,
) {
  try {
    return await trpcClient.alerts.listActive.query({ barangayId });
  } catch {
    if (mapPack?.alerts.length) {
      return mapPack.alerts;
    }

    return offlineScopeId ? await listOfflineAlerts(offlineScopeId) : [];
  }
}

async function buildRankedRoute(params: {
  center: EvacuationCenterOption;
  origin: LocationPoint;
  profilePurok?: string | null;
  fallbackRoutes: EvacuationRoute[];
  activeAlerts: Alert[];
}) {
  const { center, origin, profilePurok, fallbackRoutes, activeAlerts } = params;
  const cachedRoute = await readCachedRoute({ centerId: center.id, origin });

  if (cachedRoute) {
    return {
      ...cachedRoute.route,
      center,
      safetyScore: computeSafetyScore(center, activeAlerts),
    } satisfies RankedEvacuationRoute;
  }

  const staleCachedRoute = await readCachedRoute(
    { centerId: center.id, origin },
    { allowStale: true },
  );

  const roadRoute =
    (await buildTrafficAwareGoogleRoute({ center, origin })) ??
    (await buildOsrmRoadRoute({ center, origin }));

  if (roadRoute) {
    const nextRoute = {
      center,
      rank: 0,
      source: roadRoute.source,
      notice: roadRoute.notice,
      activeMode: roadRoute.drivingDurationMinutes ? "driving" : "walking",
      roadDistanceKm: roadRoute.roadDistanceKm,
      walkingDurationMinutes: roadRoute.walkingDurationMinutes,
      drivingDurationMinutes: roadRoute.drivingDurationMinutes,
      predictedTrafficDelayMinutes: roadRoute.predictedTrafficDelayMinutes,
      safetyScore: computeSafetyScore(center, activeAlerts),
      coordinates: roadRoute.coordinates,
      steps: roadRoute.steps,
      fallbackRouteId: null,
    } satisfies RankedEvacuationRoute;

    await writeCachedRoute({ centerId: center.id, origin, route: nextRoute });
    return nextRoute;
  }

  const fallbackRoute = buildFallbackRoute({
    center,
    origin,
    profilePurok,
    fallbackRoutes,
    activeAlerts,
  });

  if (
    shouldUseStaleCachedRoute({
      hasStaleCachedRoute: Boolean(staleCachedRoute),
      fallbackSource: fallbackRoute.source,
    }) &&
    staleCachedRoute
  ) {
    return {
      ...staleCachedRoute.route,
      center,
      safetyScore: computeSafetyScore(center, activeAlerts),
      notice: "Using cached road guidance from the last successful route calculation.",
    } satisfies RankedEvacuationRoute;
  }

  await writeCachedRoute({ centerId: center.id, origin, route: fallbackRoute });
  return fallbackRoute;
}

function mapNearbyCenter(center: NearbyCenter): EvacuationCenterOption {
  return {
    id: center.id,
    name: center.name,
    address: center.address,
    latitude: center.latitude,
    longitude: center.longitude,
    capacity: center.capacity,
    currentOccupancy: center.current_occupancy,
    isOpen: center.is_open,
    contactNumber: center.contact_number,
    notes: center.notes,
    straightLineDistanceKm: center.distance_km,
  };
}

async function buildTrafficAwareGoogleRoute(params: {
  center: EvacuationCenterOption;
  origin: LocationPoint;
}) {
  const apiKey = env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const [drivingAlternatives, walkingRoute] = await Promise.all([
      fetchGoogleDirections({
        origin: params.origin,
        destination: {
          latitude: params.center.latitude,
          longitude: params.center.longitude,
        },
        mode: "driving",
        apiKey,
        alternatives: true,
      }),
      fetchGoogleDirections({
        origin: params.origin,
        destination: {
          latitude: params.center.latitude,
          longitude: params.center.longitude,
        },
        mode: "walking",
        apiKey,
        alternatives: false,
      }).catch(() => []),
    ]);

    const bestDrivingRoute = drivingAlternatives
      .map((candidate) => ({
        ...candidate,
        recommendationScore: getTrafficCandidateScore(candidate),
      }))
      .sort((left, right) => left.recommendationScore - right.recommendationScore)[0];

    if (!bestDrivingRoute) {
      return null;
    }

    return {
      coordinates: bestDrivingRoute.coordinates,
      roadDistanceKm: bestDrivingRoute.distanceKm,
      drivingDurationMinutes: bestDrivingRoute.durationMinutes,
      walkingDurationMinutes: walkingRoute[0]?.durationMinutes ?? null,
      predictedTrafficDelayMinutes: bestDrivingRoute.predictedTrafficDelayMinutes,
      steps: bestDrivingRoute.steps,
      source: "google-traffic" as const,
      notice: "Using traffic-aware road routing for the fastest available evacuation path." as const,
    } satisfies TrafficAwareCandidate;
  } catch {
    return null;
  }
}

async function fetchGoogleDirections(params: {
  origin: LocationPoint;
  destination: LocationPoint;
  mode: Extract<RouteTravelMode, "walking" | "driving">;
  apiKey: string;
  alternatives: boolean;
}) {
  const { origin, destination, mode, apiKey, alternatives } = params;
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
  url.searchParams.set("mode", mode);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("alternatives", alternatives ? "true" : "false");

  if (mode === "driving") {
    url.searchParams.set("departure_time", "now");
    url.searchParams.set("traffic_model", "best_guess");
  }

  const response = await fetchWithTimeout(url.toString());
  const payload = (await response.json()) as GoogleDirectionsResponse;

  if (!response.ok || payload.status !== "OK" || !payload.routes?.length) {
    throw new Error(payload.error_message || payload.status || "Directions request failed.");
  }

  return payload.routes
    .map((route, routeIndex) => {
      const leg = route.legs?.[0];

      if (!leg) {
        return null;
      }

      const baseDurationMinutes = Math.max(1, Math.round((leg.duration?.value ?? 0) / 60));
      const trafficDurationMinutes =
        leg.duration_in_traffic?.value !== undefined
          ? Math.max(1, Math.round(leg.duration_in_traffic.value / 60))
          : null;

      return {
        id: `${mode}-${routeIndex}`,
        summary: route.summary ?? null,
        distanceKm: (leg.distance?.value ?? 0) / 1000,
        durationMinutes: trafficDurationMinutes ?? baseDurationMinutes,
        predictedTrafficDelayMinutes:
          trafficDurationMinutes !== null
            ? Math.max(0, trafficDurationMinutes - baseDurationMinutes)
            : null,
        coordinates: decodePolyline(route.overview_polyline?.points ?? ""),
        steps: (leg.steps ?? []).map((step, stepIndex) => ({
          id: `${mode}-${routeIndex}-${stepIndex}`,
          instruction: normalizeInstruction(step.html_instructions, stepIndex),
          distanceMeters: step.distance?.value ?? 0,
          durationMinutes:
            step.duration?.value !== undefined
              ? Math.max(1, Math.round(step.duration.value / 60))
              : null,
          maneuver: mapGoogleManeuver(step.maneuver, stepIndex, leg.steps?.length ?? 0),
          streetName: route.summary ?? null,
        })),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
}

function getTrafficCandidateScore(candidate: {
  distanceKm: number;
  durationMinutes: number;
  predictedTrafficDelayMinutes: number | null;
}) {
  return (
    candidate.durationMinutes +
    (candidate.predictedTrafficDelayMinutes ?? 0) * 1.5 +
    candidate.distanceKm * 0.4
  );
}

const ROUTING_FETCH_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), ROUTING_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function buildOsrmRoadRoute(params: {
  center: EvacuationCenterOption;
  origin: LocationPoint;
}) {
  const { center, origin } = params;
  const coordinates = `${origin.longitude},${origin.latitude};${center.longitude},${center.latitude}`;
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coordinates}`);
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("steps", "true");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");

  const response = await fetchWithTimeout(url.toString());
  const payload = (await response.json()) as OsrmRouteResponse;
  const route = payload.routes?.[0];

  if (!response.ok || payload.code !== "Ok" || !route) {
    return null;
  }

  return {
    coordinates:
      route.geometry?.coordinates?.map(([longitude, latitude]) => ({ latitude, longitude })) ?? [],
    roadDistanceKm: route.distance / 1000,
    drivingDurationMinutes: Math.max(1, Math.round(route.duration / 60)),
    walkingDurationMinutes: null,
    predictedTrafficDelayMinutes: null,
    steps: (route.legs?.[0]?.steps ?? []).map((step, index, allSteps) => ({
      id: `osrm-${index}`,
      instruction: buildOsrmInstruction(step.name, step.maneuver?.type, step.maneuver?.modifier),
      distanceMeters: Math.round(step.distance ?? 0),
      durationMinutes:
        step.duration !== undefined ? Math.max(1, Math.round(step.duration / 60)) : null,
      maneuver: mapOsrmManeuver(step.maneuver?.type, step.maneuver?.modifier, index, allSteps.length),
      streetName: step.name ?? null,
    })),
    source: "osrm-road" as const,
    notice: "Using OSRM road routing because Google traffic data is unavailable." as const,
  } satisfies TrafficAwareCandidate;
}

function buildFallbackRoute(params: {
  center: EvacuationCenterOption;
  origin: LocationPoint;
  profilePurok?: string | null;
  fallbackRoutes: EvacuationRoute[];
  activeAlerts: Alert[];
}) {
  const { center, origin, profilePurok, fallbackRoutes, activeAlerts } = params;
  const matchingRoutes = fallbackRoutes.filter((route) => route.center_id === center.id);
  const preferredRoute =
    matchingRoutes.find((route) => route.purok_origin === profilePurok) ?? matchingRoutes[0] ?? null;

  if (!preferredRoute) {
    const coordinates = [origin, { latitude: center.latitude, longitude: center.longitude }];

    return {
      center,
      rank: 0,
      source: "straight-line",
      notice: "Showing straight-line guidance because live road routing is unavailable.",
      activeMode: "fallback",
      roadDistanceKm: center.straightLineDistanceKm,
      walkingDurationMinutes: estimateWalkingMinutes(center.straightLineDistanceKm),
      drivingDurationMinutes: estimateDrivingMinutes(center.straightLineDistanceKm),
      predictedTrafficDelayMinutes: null,
      safetyScore: computeSafetyScore(center, activeAlerts),
      coordinates,
      steps: [
        {
          id: `${center.id}-fallback-depart`,
          instruction: `Head toward ${center.name}.`,
          distanceMeters: Math.round(center.straightLineDistanceKm * 1000),
          durationMinutes: estimateWalkingMinutes(center.straightLineDistanceKm),
          maneuver: "depart",
          streetName: null,
        },
        {
          id: `${center.id}-fallback-arrive`,
          instruction: `Arrive at ${center.name}.`,
          distanceMeters: 0,
          durationMinutes: null,
          maneuver: "arrive",
          streetName: null,
        },
      ],
      fallbackRouteId: null,
    } satisfies RankedEvacuationRoute;
  }

  const routeCoordinates = parseRouteCoordinates(preferredRoute);
  const coordinates = routeCoordinates.length > 0 ? [origin, ...routeCoordinates] : [origin];
  const segmentSteps = buildSegmentSteps({
    coordinates,
    centerName: center.name,
  });
  const distanceKm =
    preferredRoute.distance_meters && preferredRoute.distance_meters > 0
      ? preferredRoute.distance_meters / 1000
      : estimatePolylineDistanceKm(coordinates);

  return {
    center,
    rank: 0,
    source: "seeded-route",
    notice: "Using seeded barangay route because live road routing is unavailable.",
    activeMode: "fallback",
    roadDistanceKm: distanceKm,
    walkingDurationMinutes:
      preferredRoute.estimated_walk_minutes ?? estimateWalkingMinutes(distanceKm),
    drivingDurationMinutes: estimateDrivingMinutes(distanceKm),
    predictedTrafficDelayMinutes: null,
    safetyScore: computeSafetyScore(center, activeAlerts),
    coordinates,
    steps: segmentSteps,
    fallbackRouteId: preferredRoute.id,
  } satisfies RankedEvacuationRoute;
}

function buildSegmentSteps(params: {
  coordinates: LocationPoint[];
  centerName: string;
}) {
  const { coordinates, centerName } = params;

  if (coordinates.length < 2) {
    return [
      {
        id: `${centerName}-arrive`,
        instruction: `Arrive at ${centerName}.`,
        distanceMeters: 0,
        durationMinutes: null,
        maneuver: "arrive",
        streetName: null,
      },
    ] satisfies RouteStep[];
  }

  const steps: RouteStep[] = [];

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const distanceMeters = Math.max(
      1,
      Math.round(
        haversineDistanceKm(start.latitude, start.longitude, end.latitude, end.longitude) * 1000,
      ),
    );
    const distanceKm = distanceMeters / 1000;

    const instruction =
      index === 0
        ? `Head out toward ${centerName}.`
        : `${describeTurn(coordinates[index - 1], start, end)} and continue.`;

    steps.push({
      id: `${centerName}-${index}`,
      instruction,
      distanceMeters,
      durationMinutes: estimateWalkingMinutes(distanceKm),
      maneuver:
        index === 0 ? "depart" : getRelativeTurn(coordinates[index - 1], start, end),
      streetName: null,
    });
  }

  steps.push({
    id: `${centerName}-arrive`,
    instruction: `Arrive at ${centerName}.`,
    distanceMeters: 0,
    durationMinutes: null,
    maneuver: "arrive",
    streetName: null,
  });

  return steps;
}

function buildOsrmInstruction(
  streetName: string | undefined,
  type: string | undefined,
  modifier: string | undefined,
) {
  if (type === "arrive") {
    return "Arrive at the evacuation center.";
  }

  if (type === "depart") {
    return streetName ? `Head out via ${streetName}.` : "Head out toward the route.";
  }

  if (modifier === "left") {
    return streetName ? `Turn left onto ${streetName}.` : "Turn left.";
  }

  if (modifier === "right") {
    return streetName ? `Turn right onto ${streetName}.` : "Turn right.";
  }

  return streetName ? `Continue on ${streetName}.` : "Continue straight.";
}

function mapOsrmManeuver(
  type: string | undefined,
  modifier: string | undefined,
  index: number,
  stepCount: number,
): RouteStepManeuver {
  if (type === "depart" || index === 0) {
    return "depart";
  }

  if (type === "arrive" || index === stepCount - 1) {
    return "arrive";
  }

  if (modifier === "left") {
    return "left";
  }

  if (modifier === "right") {
    return "right";
  }

  return "straight";
}

function describeTurn(from: LocationPoint, via: LocationPoint, to: LocationPoint) {
  const turn = getRelativeTurn(from, via, to);

  if (turn === "left") {
    return "Turn left";
  }

  if (turn === "right") {
    return "Turn right";
  }

  return "Continue straight";
}

function getRelativeTurn(
  from: LocationPoint,
  via: LocationPoint,
  to: LocationPoint,
): RouteStepManeuver {
  const before = getBearing(from, via);
  const after = getBearing(via, to);
  const delta = normalizeAngle(after - before);

  if (delta > 30) {
    return "right";
  }

  if (delta < -30) {
    return "left";
  }

  return "straight";
}

function getBearing(start: LocationPoint, end: LocationPoint) {
  const lat1 = degreesToRadians(start.latitude);
  const lat2 = degreesToRadians(end.latitude);
  const deltaLongitude = degreesToRadians(end.longitude - start.longitude);

  const y = Math.sin(deltaLongitude) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

function normalizeAngle(value: number) {
  if (value > 180) {
    return value - 360;
  }

  if (value < -180) {
    return value + 360;
  }

  return value;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function estimatePolylineDistanceKm(coordinates: LocationPoint[]) {
  return coordinates.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }

    const previousPoint = coordinates[index - 1];
    return (
      total +
      haversineDistanceKm(
        previousPoint.latitude,
        previousPoint.longitude,
        point.latitude,
        point.longitude,
      )
    );
  }, 0);
}

function estimateWalkingMinutes(distanceKm: number) {
  return Math.max(1, Math.round((distanceKm / 5) * 60));
}

function estimateDrivingMinutes(distanceKm: number) {
  return Math.max(1, Math.round((distanceKm / 24) * 60));
}

function normalizeInstruction(htmlInstruction: string | undefined, index: number) {
  const text = (htmlInstruction ?? "")
    .replace(/<div[^>]*>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 0) {
    return text;
  }

  return index === 0 ? "Start moving toward the evacuation center." : "Continue on the route.";
}

function mapGoogleManeuver(
  maneuver: string | undefined,
  index: number,
  stepCount: number,
): RouteStepManeuver {
  if (index === 0) {
    return "depart";
  }

  if (index === stepCount - 1) {
    return "arrive";
  }

  if (maneuver?.includes("left")) {
    return "left";
  }

  if (maneuver?.includes("right")) {
    return "right";
  }

  return "straight";
}

function parseRouteCoordinates(route: EvacuationRoute) {
  const routeCoordinates = (route.route_geojson as { coordinates?: unknown[] }).coordinates;

  if (!Array.isArray(routeCoordinates)) {
    return [];
  }

  return routeCoordinates
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) {
        return null;
      }

      const [longitude, latitude] = coordinate;

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return null;
      }

      return { latitude, longitude };
    })
    .filter((coordinate): coordinate is LocationPoint => coordinate !== null);
}

function computeSafetyScore(center: EvacuationCenterOption, activeAlerts: Alert[]) {
  const centerText = `${center.name} ${center.address} ${center.notes ?? ""}`.toLowerCase();
  const occupancyRatio =
    center.capacity > 0 ? Math.min(1.5, center.currentOccupancy / center.capacity) : 0.5;
  const hasFloodAlert = activeAlerts.some((alert) =>
    ["flood", "rainfall", "typhoon"].includes(alert.hazard_type),
  );

  let score = 100;

  if (hasFloodAlert && /(coast|coastal|creek|river|pier|wharf|shore)/.test(centerText)) {
    score -= 18;
  }

  if (/(flood|low-lying|creek|coastal)/.test(centerText)) {
    score -= 10;
  }

  score -= occupancyRatio * 20;

  return Math.max(25, Math.round(score));
}

function getRouteRecommendationScore(route: RankedEvacuationRoute) {
  const eta = route.drivingDurationMinutes ?? route.walkingDurationMinutes ?? Number.MAX_SAFE_INTEGER;
  return (
    eta +
    (route.predictedTrafficDelayMinutes ?? 0) * 1.3 +
    (100 - route.safetyScore) * 0.6 +
    route.roadDistanceKm * 0.35
  );
}

function decodePolyline(encoded: string) {
  const coordinates: LocationPoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLatitude = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += deltaLatitude;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLongitude = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += deltaLongitude;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

async function readCachedRoute(params: {
  centerId: string;
  origin: LocationPoint;
}, options?: { allowStale?: boolean }) {
  const cachedRaw = await AsyncStorage.getItem(getRouteCacheKey(params.centerId, params.origin));

  if (!cachedRaw) {
    return null;
  }

  try {
    const cachedValue = JSON.parse(cachedRaw) as CachedRouteEnvelope;
    const routeAgeMs = Date.now() - cachedValue.cachedAt;

    if (routeAgeMs > STALE_ROUTE_CACHE_TTL_MS) {
      return null;
    }

    if (routeAgeMs > ROUTE_CACHE_TTL_MS && !options?.allowStale) {
      return null;
    }

    return {
      route: cachedValue.route,
      isStale: routeAgeMs > ROUTE_CACHE_TTL_MS,
    } satisfies CachedRouteReadResult;
  } catch {
    return null;
  }
}

async function writeCachedRoute(params: {
  centerId: string;
  origin: LocationPoint;
  route: RankedEvacuationRoute;
}) {
  const cachedValue: CachedRouteEnvelope = {
    cachedAt: Date.now(),
    route: params.route,
  };

  await AsyncStorage.setItem(
    getRouteCacheKey(params.centerId, params.origin),
    JSON.stringify(cachedValue),
  );
}

function getRouteCacheKey(centerId: string, origin: LocationPoint) {
  return `${ROUTE_CACHE_PREFIX}${centerId}:${origin.latitude.toFixed(5)}:${origin.longitude.toFixed(5)}`;
}
