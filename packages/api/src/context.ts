import { env } from "@project-agap/env/server";
import { createClient, type AuthUser } from "@supabase/supabase-js";

import type { ContextProfile, Database } from "./supabase.js";

type HeadersLike = {
  get(name: string): string | null;
};
type SupabaseAuthWithGetUser = {
  getUser: () => Promise<{
    data: {
      user: AuthUser | null;
    };
  }>;
};

type RequestLike = {
  headers: HeadersLike;
};

export async function createContext(req: RequestLike) {
  // No auth 
  const authHeader = req.headers.get("Authorization");

  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
      auth: { persistSession: false },
    }
  );

  const supabaseAdmin = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )

  let session: AuthUser | null = null;
  let profile: ContextProfile | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await (supabase.auth as SupabaseAuthWithGetUser).getUser();
    if (data.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, role, barangay_id, full_name, phone_number, purok, is_sms_only")
        .eq("id", data.user.id)
        .single();

        session = data.user;
        profile = p;
    }
  }


  
  return {
    supabase,
    supabaseAdmin,
    session,
    profile,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
