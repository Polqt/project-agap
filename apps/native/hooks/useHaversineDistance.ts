import { useMemo } from "react";

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function getHaversineDistanceMeters(
  from: { latitude: number; longitude: number } | null | undefined,
  to: { latitude: number; longitude: number } | null | undefined,
) {
  if (!from || !to) {
    return null;
  }

  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function useHaversineDistance(
  from: { latitude: number; longitude: number } | null | undefined,
  to: { latitude: number; longitude: number } | null | undefined,
) {
  return useMemo(() => getHaversineDistanceMeters(from, to), [from, to]);
}
