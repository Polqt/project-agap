import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useAuth } from "./useAuth";

/**
 * Signs out, clears local session state, then replaces the navigation stack
 * so the user lands on the given route (e.g. sign-in or onboarding).
 */
export function useSignOutRedirect(href: Href) {
  const router = useRouter();
  const { signOut } = useAuth();

  return useCallback(async () => {
    await signOut();
    router.replace(href);
  }, [href, router, signOut]);
}
