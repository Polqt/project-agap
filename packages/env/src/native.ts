import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
    EXPO_PUBLIC_SUPABASE_URL: z.url(),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    EXPO_PUBLIC_APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
    EXPO_PUBLIC_OFFLINE_TILE_TEMPLATE: z.string().min(1).optional(),
    EXPO_PUBLIC_OFFLINE_TILE_PACK_LABEL: z.string().min(1).optional(),
    EXPO_PUBLIC_OFFLINE_TILE_PACK_VERSION: z.string().min(1).optional(),
    EXPO_PUBLIC_OFFLINE_TILE_SIZE: z.coerce.number().int().positive().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
