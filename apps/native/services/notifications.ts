import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const permissionState = await Notifications.getPermissionsAsync();
    let finalStatus = permissionState.status;

    if (finalStatus !== "granted") {
      const requestResult = await Notifications.requestPermissionsAsync();
      finalStatus = requestResult.status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("agap-alerts", {
        name: "Agap Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1A56C4",
      });
    }

    // getExpoPushTokenAsync throws in Expo Go (SDK 53+) because remote push
    // support was removed.  Catch the error and return null so the rest of the
    // app continues working.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenResult.data;
  } catch {
    // Push tokens are unavailable in Expo Go or when EAS projectId is missing.
    // Return null so callers can skip token registration gracefully.
    return null;
  }
}

export { Notifications };