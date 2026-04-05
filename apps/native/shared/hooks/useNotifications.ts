import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";

import {
  getNotificationsModule,
  registerForPushNotificationsAsync,
} from "@/services/notifications";
import { trpcClient } from "@/services/trpc";
import { setHasUnreadAlert } from "@/stores/app-shell-store";
import { useNotificationPreferences } from "./useNotificationPreferences";

type NotificationData = {
  type?: string;
  broadcastId?: string;
  alertId?: string;
  needsReportId?: string;
};

function handleNotificationTap(data: NotificationData) {
  switch (data.type) {
    case "broadcast":
      router.push("/(resident)/alerts");
      break;
    case "alert":
      if (data.alertId) {
        router.push({ pathname: "/alert-detail", params: { id: data.alertId } });
      } else {
        router.push("/(resident)/alerts");
      }
      break;
    case "needs_report":
      if (data.needsReportId) {
        router.push("/(resident)/status");
      }
      break;
    default:
      break;
  }
}

export function useNotifications(enabled: boolean) {
  const { preferences, isLoaded } = useNotificationPreferences();
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  // Register push token
  useEffect(() => {
    if (!enabled || (isLoaded && !preferences.pushEnabled)) {
      return;
    }

    let cancelled = false;

    async function register() {
      const token = await registerForPushNotificationsAsync();

      if (!token || cancelled) {
        return;
      }

      try {
        await trpcClient.profile.upsertPushToken.mutate({
          token,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
      } catch {
        // Push registration should never block core safety flows.
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isLoaded]);

  // Listen for notification taps (deep links)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const notifications = getNotificationsModule();
    if (!notifications) {
      return;
    }

    // Handle taps on notifications while app is running
    const responseSubscription = notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = (response.notification.request.content.data ?? {}) as NotificationData;
        handleNotificationTap(data);
      },
    );

    // Mark unread alert badge when a notification arrives in foreground
    const receivedSubscription = notifications.addNotificationReceivedListener((notification) => {
      const data = (notification.request.content.data ?? {}) as NotificationData;
      const prefs = prefsRef.current;
      const isBroadcast = data.type === "broadcast" && prefs.broadcastNotifications;
      const isAlert = data.type === "alert" && prefs.alertNotifications;
      if (isBroadcast || isAlert) {
        setHasUnreadAlert(true);
      }
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [enabled]);
}
