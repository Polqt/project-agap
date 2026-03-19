import type { AppRouter } from "@project-agap/api/routers/index";

import { env } from "@project-agap/env/native";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { queryClient } from "@/providers/QueryProvider";
import { supabase } from "@/services/supabase";

export { queryClient };

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.EXPO_PUBLIC_SERVER_URL}/api/trpc`,
      headers: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        return session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : {};
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
