import type { AppRouter } from "@project-agap/api/routers/index";
import { env } from "@project-agap/env/native";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { getSafeSupabaseSession } from "@/services/supabase";
import { appShellStore } from "@/stores/app-shell-store";

const NORMAL_LINK_TIMEOUT_MS = 9_000;
const WEAK_LINK_TIMEOUT_MS = 18_000;

export const queryClient = new QueryClient({
  queryCache: new QueryCache(),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
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
      maxItems: 1,
      fetch: async (url, options) => {
        const isWeak = appShellStore.state.syncStatus === "degraded";
        const timeoutMs = isWeak ? WEAK_LINK_TIMEOUT_MS : NORMAL_LINK_TIMEOUT_MS;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        try {
          return await Promise.race([
            fetch(url, options),
            new Promise<Response>((_, reject) => {
              timeoutHandle = setTimeout(() => reject(new Error("Network request timed out")), timeoutMs);
            }),
          ]);
        } finally {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        }
      },
      headers: async () => {
        const session = await getSafeSupabaseSession();

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
