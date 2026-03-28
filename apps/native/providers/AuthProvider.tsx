import type { Profile } from "@project-agap/api/supabase";
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
      throw error;
    }

    setProfile(data);
    setSelectedRole(data?.role ?? null);

    return data;
  }, [session?.user.id]);

  const handleSessionChange = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        setSelectedRole(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", nextSession.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(data);
      setSelectedRole(data?.role ?? null);
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(currentSession);

      if (currentSession) {
        const { data } = await supabase
          .from("profiles")
          .select(profileSelect)
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        setProfile(data);
        setSelectedRole(data?.role ?? null);
      }

      setIsLoading(false);
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, nextSession) => {
      void handleSessionChange(nextSession);
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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: input.fullName,
          phone_number: input.phoneNumber ?? null,
          barangay_id: input.barangayId,
          purok: input.purok,
        })
        .eq("id", data.user.id);

      if (updateError) {
        throw updateError;
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
