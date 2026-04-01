# @project-agap/env — Environment Configuration Package

> **Purpose:** Use this document as context when prompting Claude (or other AI) to develop features like an admin dashboard. It fully describes the env package setup, schema, and usage across the project.

---

## Directory Structure

```
d:\upv-hack\project-agap\packages\env\
├── src/
│   ├── web.ts      # Next.js web app env (client + server)
│   ├── server.ts   # Server-only env (API, DB, etc.)
│   └── native.ts   # Expo/React Native app env
├── package.json
├── tsconfig.json
└── ENV_SETUP.md    # This file
```

---

## Package Overview

**Package name:** `@project-agap/env`  
**Type:** `module` (ESM)  
**Imports:** `from "@project-agap/env"` with subpaths: `/server`, `/web`, `/native`

### Exports

| Import Path | File | Purpose |
|-------------|------|---------|
| `@project-agap/env/server` | `src/server.ts` | Server-side env (Node.js, tRPC, API, DB) |
| `@project-agap/env/web` | `src/web.ts` | Next.js web app (client + server validation) |
| `@project-agap/env/native` | `src/native.ts` | Expo/React Native mobile app |

**Dependencies:** `@t3-oss/env-core`, `@t3-oss/env-nextjs`, `dotenv`, `zod`

---

## Schema Definitions

### 1. `web.ts` — Next.js Web App

**Library:** `@t3-oss/env-nextjs`  
**Options:** `emptyStringAsUndefined: true`  
**Load:** Imported in `apps/web/next.config.ts` (side-effect only, validates at startup)

| Variable | Type | Required | Location | Notes |
|----------|------|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `z.url()` | Yes | client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `z.string().min(1)` | Yes | client | Supabase anon/publishable key |
| `NEXT_PUBLIC_APP_ENV` | `z.enum(["development","preview","production"])` | No | client | Default: `"development"` |
| `SUPABASE_SERVICE_ROLE_KEY` | `z.string().min(1)` | Yes | server | Supabase service role key |
| `SMS_WEBHOOK_SECRET` | `z.string().min(16)` | Yes | server | Min 16 chars for webhook verification |

**Where env is loaded:** `apps/web/.env.local` (Next.js default)

---

### 2. `server.ts` — Server / API / DB

**Library:** `@t3-oss/env-core`  
**Load:** `import "dotenv/config"` at top (loads `.env` from cwd)  
**Options:** `emptyStringAsUndefined: true`

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `DATABASE_URL` | `z.string().min(1)` | Yes | PostgreSQL connection string |
| `CORS_ORIGIN` | `z.url()` | Yes | Allowed CORS origin URL |
| `NODE_ENV` | `z.enum(["development","production","test"])` | No | Default: `"development"` |
| `SUPABASE_URL` | `z.url()` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | `z.string().min(1)` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `z.string().min(1)` | Yes | Supabase service role key |
| `ANTHROPIC_API_KEY` | `z.string().min(1)` | Yes | Anthropic API key |
| `SMS_WEBHOOK_SECRET` | `z.string().min(16)` | Yes | Min 16 chars |

**Where env is loaded:** `dotenv/config` loads from process cwd. Typically `.env` or `.env.local` in `apps/web/` (used by `packages/db` drizzle config) or root.

---

### 3. `native.ts` — Expo / React Native

**Library:** `@t3-oss/env-core`  
**Client prefix:** `EXPO_PUBLIC_`  
**Options:** `emptyStringAsUndefined: true`

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `EXPO_PUBLIC_SERVER_URL` | `z.url()` | Yes | tRPC API base URL |
| `EXPO_PUBLIC_SUPABASE_URL` | `z.url()` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `z.string().min(1)` | Yes | Supabase anon key |
| `EXPO_PUBLIC_APP_ENV` | `z.enum(["development","preview","production"])` | No | Default: `"development"` |

---

## Usage / Consumers

| Consumer | Import | Usage |
|----------|--------|-------|
| `apps/web/next.config.ts` | `import "@project-agap/env/web"` | Side-effect: validates env at startup |
| `apps/web` (Supabase client, etc.) | `process.env.NEXT_PUBLIC_*` | Next.js injects client vars |
| `packages/api/src/context.ts` | `import { env } from "@project-agap/env/server"` | `env.SUPABASE_URL`, `env.SUPABASE_ANON_KEY`, `env.SUPABASE_SERVICE_ROLE_KEY` |
| `packages/db/src/index.ts` | `import { env } from "@project-agap/env/server"` | `env.DATABASE_URL` |
| `packages/db/drizzle.config.ts` | `dotenv` + `process.env.DATABASE_URL` | Loads from `apps/web/.env` |
| `apps/native/utils/trpc.ts` | `import { env } from "@project-agap/env/native"` | `env.EXPO_PUBLIC_SERVER_URL` |

---

## Environment File Locations

| App/Package | Env file(s) | Notes |
|-------------|-------------|-------|
| `apps/web` | `.env.local`, `.env` | Next.js loads `.env.local` first. Used by web + server env. |
| `packages/db` | `../../apps/web/.env` | Drizzle config explicitly loads from apps/web |
| `apps/native` | `.env` | Expo loads `.env` in project root |

---

## Full Source Code (for prompt context)

### `packages/env/src/web.ts`

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SMS_WEBHOOK_SECRET: z.string().min(16),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV:           process.env.NEXT_PUBLIC_APP_ENV,
    SMS_WEBHOOK_SECRET: process.env.SMS_WEBHOOK_SECRET,
  },
  emptyStringAsUndefined: true,
});
```

### `packages/env/src/server.ts`

```typescript
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

    // SMS Gateway
    SMS_WEBHOOK_SECRET: z.string().min(16),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

### `packages/env/src/native.ts`

```typescript
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
    EXPO_PUBLIC_SUPABASE_URL: z.url(),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    EXPO_PUBLIC_APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

### `packages/env/package.json`

```json
{
  "name": "@project-agap/env",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./server": "./src/server.ts",
    "./web": "./src/web.ts",
    "./native": "./src/native.ts"
  },
  "dependencies": {
    "@t3-oss/env-core": "^0.13.10",
    "@t3-oss/env-nextjs": "^0.13.10",
    "dotenv": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@project-agap/config": "workspace:*",
    "@types/node": "^22.13.14",
    "typescript": "catalog:"
  }
}
```

---

## Admin Dashboard Considerations

For an admin dashboard in this project:

1. **Use `@project-agap/env/server`** for API/tRPC context (Supabase admin client, DB, etc.).
2. **Use `@project-agap/env/web`** or `process.env.NEXT_PUBLIC_*` for client-side web env.
3. **Ensure env parity:** `server` expects `SUPABASE_URL` and `SUPABASE_ANON_KEY` (no `NEXT_PUBLIC_` prefix). The web app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. They should be the same values.
4. **Admin auth:** Supabase admin client uses `SUPABASE_SERVICE_ROLE_KEY` and is available in `packages/api` context as `supabaseAdmin`.
5. **Add new env vars** by extending the schema in `web.ts` or `server.ts` and updating `.env.example` / `.env.local`.

---

## Project Root Path

```
d:\upv-hack\project-agap\packages\env\
```

Full path to source files:
- `d:\upv-hack\project-agap\packages\env\src\web.ts`
- `d:\upv-hack\project-agap\packages\env\src\server.ts`
- `d:\upv-hack\project-agap\packages\env\src\native.ts`
