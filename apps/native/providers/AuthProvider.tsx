import type { Profile, VulnerabilityFlag } from "@project-agap/api/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { AuthContext, type ResidentSignUpInput } from "@/shared/hooks/useAuth";
import { useNotifications } from "@/shared/hooks/useNotifications";
import { clearStoredSupabaseSession, supabase } from "@/services/supabase";
import { clearRegisteredPushToken, getRegisteredPushToken } from "@/services/notifications";
import { queryClient, trpcClient } from "@/services/trpc";
import { resetAppShellStore, setSelectedRole } from "@/stores/app-shell-store";

function mapSessionRole(profile: Profile | null) {
  return profile?.role ?? null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const currentUserId = session?.user.id;

    if (!currentUserId) {
      setProfile(null);
      return null;
    }

    try {
      const data = await trpcClient.profile.getMe.query();
      setProfile(data);
      setSelectedRole(data?.role ?? null);
      return data;
    } catch {
      setProfile(null);
      setSelectedRole(null);
      return null;
    }
  }, [session?.user.id]);

  const handleSessionChange = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession) {
        setSession(null);
        setProfile(null);
        setSelectedRole(null);
        setIsLoading(false);
        return;
      }

      try {
        setSession(nextSession);

        const data = await trpcClient.profile.getMe.query();
        setProfile(data);
        setSelectedRole(data?.role ?? null);
      } catch {
        setSession(null);
        setProfile(null);
        setSelectedRole(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
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

        setSession(currentSession);

        if (currentSession) {
          if (!isMounted) {
            return;
          }

          try {
            const data = await trpcClient.profile.getMe.query();
            if (!isMounted) {
              return;
            }
            setProfile(data);
            setSelectedRole(data?.role ?? null);
          } catch {
            setProfile(null);
            setSelectedRole(null);
          }
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setProfile(null);
        setSelectedRole(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, nextSession) => {
      void handleSessionChange(nextSession).catch(() => {
        setSession(null);
        setProfile(null);
        setSelectedRole(null);
        setIsLoading(false);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleSessionChange]);

  useNotifications(Boolean(session?.user.id && profile?.barangay_id));

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signUpResident = useCallback(
    async (input: ResidentSignUpInput) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            role: "resident",
            full_name: input.fullName,
            phone_number: input.phoneNumber ?? null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        return;
      }

      if (!data.session) {
        return;
      }

      setSession(data.session);

      await trpcClient.profile.update.mutate({
        fullName: input.fullName,
        phoneNumber: input.phoneNumber ?? null,
        barangayId: input.barangayId,
        purok: input.purok,
        isSmsOnly: input.isSmsOnly ?? false,
      });

      try {
        await trpcClient.households.register.mutate({
          householdHead: input.fullName,
          purok: input.purok,
          address: input.address ?? input.purok,
          phoneNumber: input.phoneNumber ?? null,
          totalMembers: input.totalMembers ?? 1,
          vulnerabilityFlags: (input.vulnerabilityFlags ?? []) as VulnerabilityFlag[],
          isSmsOnly: input.isSmsOnly ?? false,
          members: [],
          notes: null,
        });
      } catch (householdError) {
        console.warn(
          "Household registration failed:",
          householdError instanceof Error ? householdError.message : "Unknown household error.",
        );
      }

      if (data.session) {
        setSession(data.session);
        await refreshProfile();
      }
    },
    [refreshProfile],
  );

  const signOut = useCallback(async () => {
    const token = getRegisteredPushToken();
    if (token) {
      try {
        await trpcClient.profile.deactivatePushToken.mutate({ token });
      } catch {
        // Token deactivation should never block sign-out.
      }
      clearRegisteredPushToken();
    }

    await supabase.auth.signOut();
    await clearStoredSupabaseSession();
    queryClient.clear();
    resetAppShellStore();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("/(auth)/sign-in"),
    });

    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      session,
      profile,
      role: mapSessionRole(profile),
      isAuthenticated: Boolean(session),
      signIn,
      signUpResident,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [isLoading, profile, refreshProfile, resetPassword, session, signIn, signOut, signUpResident],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
