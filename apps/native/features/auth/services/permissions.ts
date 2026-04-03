import Constants from "expo-constants";
import * as Location from "expo-location";

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

export async function requestSignUpPermissionsAsync() {
  if (!isExpoGo()) {
    try {
      const Notifications = await import("expo-notifications");
      await Notifications.requestPermissionsAsync();
    } catch {
      // Non-blocking by design for signup completion.
    }
  }

  try {
    await Location.requestForegroundPermissionsAsync();
  } catch {
    // Non-blocking by design for signup completion.
  }
}
