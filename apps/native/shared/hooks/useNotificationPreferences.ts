import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export type NotificationPreferences = {
  pushEnabled: boolean;
  alertNotifications: boolean;
  broadcastNotifications: boolean;
  playSound: boolean;
};

const STORAGE_KEY = "agap:notification_preferences";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  alertNotifications: true,
  broadcastNotifications: true,
  playSound: true,
};

async function loadPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<NotificationPreferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

async function savePreferences(prefs: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage failure should never crash the app.
  }
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setPreferences(prefs);
      setIsLoaded(true);
    });
  }, []);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      const next = { ...preferences, ...updates };
      setPreferences(next);
      await savePreferences(next);
    },
    [preferences],
  );

  return { preferences, isLoaded, updatePreferences };
}
