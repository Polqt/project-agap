import Constants from "expo-constants";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

export async function requestSignUpPermissionsAsync() {
  if (isExpoGo()) {
    return;
  }

  try {
    await Notifications.requestPermissionsAsync();
  } catch {
    // Non-blocking by design for signup completion.
  }

  try {
    await Location.requestForegroundPermissionsAsync();
  } catch {
    // Non-blocking by design for signup completion.
  }
}
