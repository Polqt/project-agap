import type { EvacuationRoute } from "@project-agap/api/supabase";

import type { LocationPoint } from "@/types/map";

export type RouteTravelMode = "walking" | "driving" | "fallback";

export type RouteNotice =
  | "Using traffic-aware road routing for the fastest available evacuation path."
  | "Using OSRM road routing because Google traffic data is unavailable."
  | "Using seeded barangay route because live road routing is unavailable."
  | "Showing straight-line guidance because live road routing is unavailable.";

export type RouteStepManeuver =
  | "depart"
  | "straight"
  | "left"
  | "right"
  | "arrive";

export type EvacuationCenterOption = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy: number;
  isOpen: boolean;
  contactNumber: string | null;
  notes: string | null;
  straightLineDistanceKm: number;
};

export type RouteStep = {
  id: string;
  instruction: string;
  distanceMeters: number;
  durationMinutes: number | null;
  maneuver: RouteStepManeuver;
  streetName?: string | null;
};

export type RankedEvacuationRoute = {
  center: EvacuationCenterOption;
  rank: number;
  source: "google-traffic" | "osrm-road" | "seeded-route" | "straight-line";
  notice: RouteNotice | null;
  activeMode: RouteTravelMode;
  roadDistanceKm: number;
  walkingDurationMinutes: number | null;
  drivingDurationMinutes: number | null;
  predictedTrafficDelayMinutes: number | null;
  safetyScore: number;
  coordinates: LocationPoint[];
  steps: RouteStep[];
  fallbackRouteId: EvacuationRoute["id"] | null;
};

export type EvacuationNavigationResult = {
  origin: LocationPoint;
  rankedRoutes: RankedEvacuationRoute[];
  generatedAt: number;
};
