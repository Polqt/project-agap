import type { AppRouter } from "@project-agap/api/routers/index";
import { env } from "@project-agap/env/native";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { supabase } from "@/services/supabase";

export const queryClient = new QueryClient({
  queryCache: new QueryCache(),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

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
