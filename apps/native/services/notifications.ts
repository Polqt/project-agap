import Constants from "expo-constants";
import { Platform } from "react-native";

type ExpoNotificationsModule = typeof import("expo-notifications");

type NotificationContentInput = {
  title: string;
  body: string;
};

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

function getNotificationsModule() {
  if (isExpoGo()) {
    return null;
  }

  try {
    return require("expo-notifications") as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

let hasConfiguredNotificationHandler = false;

function ensureNotificationHandlerConfigured(notifications: ExpoNotificationsModule) {
  if (hasConfiguredNotificationHandler) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  hasConfiguredNotificationHandler = true;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const notifications = getNotificationsModule();

  if (!notifications) {
    return null;
  }

  ensureNotificationHandlerConfigured(notifications);

  try {
    const permissionState = await notifications.getPermissionsAsync();
    let finalStatus = permissionState.status;

    if (finalStatus !== "granted") {
      const requestResult = await notifications.requestPermissionsAsync();
      finalStatus = requestResult.status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    if (Platform.OS === "android") {
      await notifications.setNotificationChannelAsync("agap-alerts", {
        name: "Agap Alerts",
        importance: notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1A56C4",
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenResult = await notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenResult.data;
  } catch {
    return null;
  }
}

export async function scheduleAlertNotificationAsync(content: NotificationContentInput) {
  const notifications = getNotificationsModule();

  if (!notifications) {
    return;
  }

  ensureNotificationHandlerConfigured(notifications);

  try {
    await notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
  } catch {
    // Local notification fallback should never block realtime refresh.
  }
}
