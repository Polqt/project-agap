import { useQuery } from "@tanstack/react-query";

import type { LocationPoint } from "@/types/map";

import { buildEvacuationNavigation } from "../services/evacuationNavigation";
import type { RankedEvacuationRoute } from "../types";

export function useEvacuationNavigation(params: {
  barangayId?: string | null;
  offlineScopeId?: string | null;
  origin: LocationPoint | null;
  profilePurok?: string | null;
  fallbackRoutes: import("@project-agap/api/supabase").EvacuationRoute[];
  selectedCenterId: string | null;
}) {
  const { barangayId, offlineScopeId, origin, profilePurok, fallbackRoutes, selectedCenterId } = params;

  const navigationQuery = useQuery({
    queryKey: [
      "evacuation-navigation",
      barangayId,
      profilePurok,
      origin?.latitude ?? null,
      origin?.longitude ?? null,
      fallbackRoutes.map((route) => route.id).join(","),
    ],
    enabled: Boolean(barangayId && origin),
    queryFn: async () => {
      if (!barangayId || !origin) {
        return null;
      }

      return buildEvacuationNavigation({
        barangayId,
        offlineScopeId,
        origin,
        profilePurok,
        fallbackRoutes,
      });
    },
  });

  const rankedRoutes = navigationQuery.data?.rankedRoutes ?? [];
  const selectedRoute =
    rankedRoutes.find((route) => route.center.id === selectedCenterId) ?? rankedRoutes[0] ?? null;

  return {
    ...navigationQuery,
    origin: navigationQuery.data?.origin ?? origin,
    rankedRoutes,
    selectedRoute: selectedRoute as RankedEvacuationRoute | null,
  };
}
