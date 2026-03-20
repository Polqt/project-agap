"use client";

import type { User } from "@supabase/supabase-js";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { user, isLoading, supabase };
}

export function useAuthClient() {
  const { user, isLoading, supabase } = useUser();

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    signInWithEmail: async (email: string, password: string) => {
      return supabase.auth.signInWithPassword({ email, password });
    },
    signUpWithEmail: async (email: string, password: string) => {
      return supabase.auth.signUp({ email, password });
    },
    signInWithOAuth: async (provider: "google" | "github") => {
      return supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    },
  };
}
