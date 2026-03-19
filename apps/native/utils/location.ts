import * as Location from "expo-location";

export async function getCurrentCoordinates() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
