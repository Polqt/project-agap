import type { Profile, VulnerabilityFlag } from "@project-agap/api/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { AuthContext, type ResidentSignUpInput } from "@/shared/hooks/useAuth";
import { useNotifications } from "@/shared/hooks/useNotifications";
import { clearStoredSupabaseSession, supabase } from "@/services/supabase";
import { queryClient } from "@/services/trpc";
import { resetAppShellStore, setSelectedRole } from "@/stores/app-shell-store";

const profileSelect =
  "id, role, full_name, phone_number, barangay_id, purok, is_sms_only, created_at, updated_at";

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

    const { data, error } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("id", currentUserId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setSelectedRole(null);
      return null;
    }

    setProfile(data);
    setSelectedRole(data?.role ?? null);

    return data;
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

        const { data, error } = await supabase
          .from("profiles")
          .select(profileSelect)
          .eq("id", nextSession.user.id)
          .maybeSingle();

        if (error) {
          setProfile(null);
          setSelectedRole(null);
          return;
        }

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
          const { data, error } = await supabase
            .from("profiles")
            .select(profileSelect)
            .eq("id", currentSession.user.id)
            .maybeSingle();

          if (!isMounted) {
            return;
          }

          if (error) {
            setProfile(null);
            setSelectedRole(null);
          } else {
            setProfile(data);
            setSelectedRole(data?.role ?? null);
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

      // Update profile with barangay + purok + sms-only
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: input.fullName,
          phone_number: input.phoneNumber ?? null,
          barangay_id: input.barangayId,
          purok: input.purok,
          is_sms_only: input.isSmsOnly ?? false,
        })
        .eq("id", data.user.id);

      if (updateError) {
        throw updateError;
      }

      // Register household if household data was provided
      if (input.barangayId) {
        const { error: householdError } = await supabase.from("households").insert({
          barangay_id: input.barangayId,
          registered_by: data.user.id,
          household_head: input.fullName,
          purok: input.purok,
          address: input.address ?? input.purok,
          phone_number: input.phoneNumber ?? null,
          total_members: input.totalMembers ?? 1,
          vulnerability_flags: (input.vulnerabilityFlags ?? []) as VulnerabilityFlag[],
          is_sms_only: input.isSmsOnly ?? false,
          evacuation_status: "unknown",
        });

        // Non-fatal — household creation failure shouldn't block auth
        if (householdError) {
          console.warn("Household registration failed:", householdError.message);
        }
      }

      if (data.session) {
        setSession(data.session);
        await refreshProfile();
      }
    },
    [refreshProfile],
  );

  const signOut = useCallback(async () => {
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
