import type { Database } from "@project-agap/api/supabase";
import { env } from "@project-agap/env/native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_STORAGE_KEY = "agap-auth-session";

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storageKey: SUPABASE_STORAGE_KEY,
      storage: secureStoreAdapter,
      detectSessionInUrl: false,
    },
  },
);

export async function clearStoredSupabaseSession() {
  await SecureStore.deleteItemAsync(SUPABASE_STORAGE_KEY);
}

export function isInvalidRefreshTokenError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
}

export async function clearBrokenSupabaseSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Clearing broken local auth state should stay best-effort.
  }

  await clearStoredSupabaseSession();
}

export async function getSafeSupabaseSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return session;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearBrokenSupabaseSession();
    }

    return null;
  }
}
