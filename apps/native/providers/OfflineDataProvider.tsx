import { useEffect, useRef, type PropsWithChildren } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { syncOfflineDataForProfile } from "@/services/offlineData";
import { bumpOfflineDataGeneration, setOfflineDataSyncing } from "@/stores/offline-data-store";

export function OfflineDataProvider({ children }: PropsWithChildren) {
  const { profile, isAuthenticated } = useAuth();
  const { isOnline, isFlushing } = useOfflineQueue();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !profile?.barangay_id || !isOnline || isFlushing || isSyncingRef.current) {
      return;
    }

    let isActive = true;
    const currentProfile = profile;

    async function sync() {
      isSyncingRef.current = true;
      setOfflineDataSyncing(true);

      try {
        await syncOfflineDataForProfile(currentProfile);
        if (isActive) {
          bumpOfflineDataGeneration();
        }
      } catch {
        if (isActive) {
          setOfflineDataSyncing(false);
        }
      } finally {
        isSyncingRef.current = false;
      }
    }

    void sync();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isFlushing, isOnline, profile]);

  return children;
}
