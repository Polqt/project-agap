import { createContext } from "@project-agap/api/context";
import { appRouter } from "@project-agap/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

async function handler(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req, session ?? undefined),
  });
}
export { handler as GET, handler as POST };
