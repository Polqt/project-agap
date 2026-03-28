import { useEffect } from "react";

import { registerForPushNotificationsAsync } from "@/services/notifications";
import { trpcClient } from "@/services/trpc";

export function useNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
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
          platform: "android",
        });
      } catch {
        // Push registration should never block core safety flows.
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
