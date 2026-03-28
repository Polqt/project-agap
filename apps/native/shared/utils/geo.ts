export function haversineDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusKm = 6371;
  const dLatitude = degreesToRadians(latitudeB - latitudeA);
  const dLongitude = degreesToRadians(longitudeB - longitudeA);

  const a =
    Math.sin(dLatitude / 2) * Math.sin(dLatitude / 2) +
    Math.cos(degreesToRadians(latitudeA)) *
      Math.cos(degreesToRadians(latitudeB)) *
      Math.sin(dLongitude / 2) *
      Math.sin(dLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function formatDistanceKm(distanceKm: number | null | undefined) {
  if (distanceKm === null || distanceKm === undefined || Number.isNaN(distanceKm)) {
    return "Distance unavailable";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
