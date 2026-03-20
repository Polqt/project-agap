import type { ContextProfile } from "@project-agap/api/supabase";
import type { Session } from "@supabase/supabase-js";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, useSegments } from "expo-router";

import { authStore, type AuthStoreState } from "@/stores/auth.store";
import { clearStoredSupabaseSession, supabase } from "@/services/supabase";
import { queryClient } from "@/providers/QueryProvider";
import { trpcClient } from "@/utils/trpc";

export interface AuthContextValue {
  session: Session | null;
  profile: ContextProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile() {
  return trpcClient.profile.getMe.query();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ContextProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const syncStore = useCallback(
    (nextState: Partial<AuthStoreState>) => {
      authStore.setState((state) => ({
        session: "session" in nextState ? (nextState.session ?? null) : state.session,
        profile: "profile" in nextState ? (nextState.profile ?? null) : state.profile,
        isLoading: "isLoading" in nextState ? (nextState.isLoading ?? state.isLoading) : state.isLoading,
      }));
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    const nextProfile = await loadProfile();
    setProfile(nextProfile);
    syncStore({ profile: nextProfile });
  }, [syncStore]);

  const handleSession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      syncStore({ session: nextSession });

      if (!nextSession) {
        setProfile(null);
        syncStore({ profile: null });
        return;
      }

      await refreshProfile();
    },
    [refreshProfile, syncStore],
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        await handleSession(currentSession);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          syncStore({ isLoading: false });
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      try {
        setIsLoading(true);
        syncStore({ isLoading: true });

        if (event === "SIGNED_OUT") {
          await clearStoredSupabaseSession();
          queryClient.clear();
          await handleSession(null);
          router.replace("/onboarding");
          return;
        }

        await handleSession(nextSession);
      } catch {
        await handleSession(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          syncStore({ isLoading: false });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession, router, syncStore]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const rootSegment = segments[0];
    const inAuth = rootSegment === "(auth)";
    const inOnboarding = rootSegment === "onboarding";
    const inResident = rootSegment === "(resident)";
    const inOfficial = rootSegment === "(official)";
    const inShared = rootSegment === "(shared)";

    if (!session) {
      if (!inAuth && !inOnboarding) {
        router.replace("/onboarding");
      }
      return;
    }

    if (!profile) {
      return;
    }

    if (profile.role === "resident" && !inResident && !inShared) {
      router.replace("/(resident)/map");
      return;
    }

    if (profile.role === "official" && !inOfficial && !inShared) {
      router.replace("/(official)/dashboard");
    }
  }, [isLoading, profile, router, segments, session]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      signIn,
      signOut,
      refreshProfile,
    }),
    [isLoading, profile, refreshProfile, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
