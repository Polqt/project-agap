import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type PropsWithChildren } from "react";

import { queryClient } from "@/services/trpc";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "agap-query-cache",
});

const QUERY_CACHE_BUSTER = "2026-04-02-native-query-success-only";

function getQueryRootKey(queryKey: readonly unknown[]) {
  const first = queryKey[0];

  if (typeof first === "string") {
    return first;
  }

  if (Array.isArray(first)) {
    return String(first[0] ?? "");
  }

  return String(first ?? "");
}

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: QUERY_CACHE_BUSTER,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            if (query.state.status !== "success") {
              return false;
            }

            const key = getQueryRootKey(query.queryKey);
            return (
              key.includes("alerts") ||
              key.includes("evacuationCenters") ||
              key.includes("evacuationRoutes") ||
              key.includes("households")
            );
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
