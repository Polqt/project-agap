import { useEffect } from "react";
import { Platform } from "react-native";

import { registerForPushNotificationsAsync } from "@/services/notifications";
import { trpcClient } from "@/utils/trpc";

export function usePushNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function registerPushToken() {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        return;
      }

      await trpcClient.profile.upsertPushToken.mutate({
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });
    }

    void registerPushToken();
  }, [enabled]);
}
