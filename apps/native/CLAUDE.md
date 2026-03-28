# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**AGAP Native** is a React Native emergency response and disaster management mobile app (Expo Router v6). It supports two user roles — **resident** and **official** — with role-based navigation, offline-first architecture, and real-time push notifications.

## Common Commands

Run from the `apps/native` directory unless noted:

```bash
pnpm dev           # Start Expo dev server (clears cache)
pnpm start         # Start Expo dev server
pnpm android       # Run on Android
pnpm ios           # Run on iOS
pnpm prebuild      # Expo prebuild (native code generation)
```

Run from the monorepo root:

```bash
pnpm install       # Install all workspace dependencies
pnpm db:push       # Push DB schema (packages/db)
pnpm db:studio     # Open Drizzle Studio
```

## Architecture

### Routing (Expo Router v6)

File-based routing under `app/` with role-based layout groups:

```
app/
├── (auth)/         # Stack: sign-in, sign-up
├── (resident)/     # Tabs: map, status, alerts, profile
├── (official)/     # Tabs: dashboard, registry, broadcast, reports
└── (shared)/       # Stack: alert-detail, check-in, kiosk, welfare-check
```

Route screens are thin wrappers — they only import and render feature components from `shared/components/features/[feature]/`.

### Provider Stack (`app/_layout.tsx`)

Providers are nested in this order (outer → inner):
`GestureHandler → KeyboardProvider → QueryProvider → AppThemeProvider → HeroUIProvider → AuthProvider → OfflineQueueProvider`

### Feature Organization

- `shared/components/features/[feature]/` — Feature-specific UI components
- `shared/components/` — Generic reusable components
- `shared/hooks/` — Custom hooks (e.g., `useNotifications`, `useOfflineQueue`)
- `services/` — Supabase client, notifications, haptics, offline SQLite queue
- `contexts/` — React contexts (theme)
- `providers/` — Provider components (auth, query, offline queue)
- `stores/` — TanStack Store client state

### API Layer (tRPC)

The app calls a shared tRPC router from `packages/api`. Three procedure types enforce auth:

- `publicProcedure` — no auth
- `protectedProcedure` — requires valid Supabase session
- `officialProcedure` — requires session + `role === "official"`

Server URL: `EXPO_PUBLIC_SERVER_URL` (default `http://localhost:3001`)

### Authentication

Supabase Auth with JWT tokens stored in Expo SecureStore (key: `agap-auth-session`). The `AuthProvider` wraps the app and exposes session state. Two roles exist in the `profiles` table: `"resident"` and `"official"`.

### Offline Queue

Failed mutations are persisted to an SQLite database (`agap-offline.db`) via `services/offlineQueueDb.ts`. The `OfflineQueueProvider` syncs pending actions when the device reconnects (uses `@react-native-community/netinfo`).

### Styling

- **Tailwind CSS v4 + Uniwind** — Tailwind classes work in React Native via Uniwind
- **HeroUI Native** — Pre-built component library; import `cn` from `heroui-native` for className merging
- **Reanimated** — All animations use `react-native-reanimated` (plugin must remain last in `babel.config.js`)
- `global.css` imports: `tailwindcss`, `uniwind`, `heroui-native/styles`

### Forms

React Hook Form + Zod. Define a Zod schema, pass it to `zodResolver`, use `useForm`. Validation errors are typed end-to-end.

### Environment Variables

Defined in `.env` (not committed). Required vars:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SERVER_URL
```

Canonical env validation lives in `packages/env/native.ts`.

## Key Libraries

| Purpose | Library |
|---|---|
| Router | expo-router v6 |
| UI components | heroui-native |
| Styling | tailwindcss v4 + uniwind |
| Server state | @tanstack/react-query v5 |
| Client state | @tanstack/react-store |
| API | @trpc/client + tanstack-react-query |
| Auth + DB | @supabase/supabase-js |
| Forms | react-hook-form + zod |
| Local DB | expo-sqlite |
| Animations | react-native-reanimated |
| Maps | react-native-maps |
| Notifications | expo-notifications |
