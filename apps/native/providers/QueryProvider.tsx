import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type PropsWithChildren } from "react";

import { queryClient } from "@/services/trpc";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "agap-query-cache",
});

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = String(query.queryKey[0] ?? "");
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
