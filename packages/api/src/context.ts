import { env } from "@project-agap/env/server";
import type { NextRequest } from "next/server";

export async function createContext(req: NextRequest) {
  // No auth 
  const authHeader = req.headers.get("Authorization");

  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
      auth: { persistSession: false },
    }
  );

  const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )

  let session = null;
  let profile = null;

  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, role, barangay_id, full_name, phone_number, is_sms_only")
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
