import * as Location from "expo-location";

import type { LocationPoint } from "@/types/map";

export async function getCurrentLocation(): Promise<LocationPoint> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Location permission is required for this feature.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
