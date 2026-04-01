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
