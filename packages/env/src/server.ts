import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

declare const process: {
  env: Record<string, string | undefined>;
};

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    ANTHROPIC_API_KEY: z.string().min(1),

    // SMS Gateway (TextBee.dev)
    TEXTBEE_API_KEY: z.string().min(1),
    TEXTBEE_DEVICE_ID: z.string().min(1),
    SMS_WEBHOOK_SECRET: z.string().min(16),
  },
  runtimeEnv: {
    ...process.env,
    // Same values as NEXT_PUBLIC_* for the web app; omit SUPABASE_* in .env if you prefer.
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  emptyStringAsUndefined: true,
});
