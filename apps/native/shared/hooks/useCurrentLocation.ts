import { useCallback, useEffect, useState } from "react";

import { getCurrentLocation } from "@/services/location";
import type { LocationPoint } from "@/types/map";

export function useCurrentLocation(enabled = true) {
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextLocation = await getCurrentLocation();
      setLocation(nextLocation);
      return nextLocation;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load your location.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [enabled, refresh]);

  return {
    location,
    isLoading,
    error,
    refresh,
  };
}
