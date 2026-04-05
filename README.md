# Project Agap

Project Agap is an offline-first disaster risk reduction and response platform designed for barangays, responders, and residents. It helps communities report safety status, locate evacuation centers, coordinate welfare checks, monitor alerts, and keep critical information usable even under weak connectivity or no signal.

The system has two main parts:

- `Mobile app`: used by residents and barangay officials in the field
- `Web/API app`: serves the backend, tRPC API, and operational services connected to the mobile app

## What The App Does

Project Agap is built for emergency situations where normal communication becomes unreliable. The goal is to make disaster coordination faster, clearer, and more resilient.

With the app, a barangay can:

- track household accountability
- receive resident safety and help pings
- coordinate evacuation center operations
- submit and review needs reports
- assign and record welfare checks
- send emergency broadcasts
- continue core operations using cached data and queued actions while offline

## Key Features

### Resident Features

- send `I Am Safe` and `I Need Help` status pings
- view evacuation centers and route guidance
- check in to evacuation centers
- read hazard alerts and barangay broadcasts
- use locally cached data during connectivity loss

### Official Features

- monitor dashboard summaries and unresolved help pings
- manage registry and household evacuation status
- assign and complete welfare checks
- send emergency broadcasts
- manage evacuation center availability and supplies
- control resident access to status ping and check-in flows

### Offline-First Features

- SQLite-backed local data cache on the device
- queued mutation replay after reconnect
- local-first reads for critical mobile flows
- cached map guidance and seeded route fallback
- stale-data indicators and last-synced timestamps
- conflict protection for overlapping official edits on key datasets

## Why This App Matters

During disasters, connectivity is often degraded before information needs are reduced. Project Agap is designed around that reality. Instead of assuming strong internet is always available, it prioritizes:

- graceful offline behavior
- fast local access to critical data
- clear sync recovery when the connection returns
- safer coordination between residents and responders

## Tech Stack

- `Expo` + `React Native`
- `Next.js`
- `tRPC`
- `Supabase Auth` + `Postgres`
- `Drizzle`
- `TanStack Query`
- `expo-sqlite`

## Project Structure

```text
project-agap/
├── apps/
│   ├── native/      # Mobile app
│   └── web/         # Next.js app hosting the API route
├── packages/
│   ├── api/         # Shared tRPC routers and business logic
│   ├── auth/        # Auth-related code
│   └── db/          # Database schema and Supabase migrations
```

## Quick Start

Install dependencies:

```bash
pnpm install
```

Start local Supabase and apply migrations:

```bash
pnpm run supabase:start
pnpm run db:push
```

Start the backend:

```bash
pnpm run dev:web
```

Start the mobile app:

```bash
pnpm run dev:native
```

## Mobile Setup

For physical-device development, the mobile app must point to a reachable backend.

In `apps/native/.env`:

```bash
EXPO_PUBLIC_SERVER_URL=http://YOUR-LAPTOP-LAN-IP:3001
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_ENV=development
```

Do not use `localhost` on a real device.

## Remote Deployment

For remote demos or judging, deploy the backend first, then point the mobile app to that hosted URL.

Recommended:

- host `apps/web` on Vercel
- keep Supabase as the managed database/auth provider
- install a mobile build that uses the hosted backend URL

See:

- Native deployment guide: [apps/native/README.md](/c:/Users/poyhi/project-agap/apps/native/README.md)
- Web/API deployment guide: [apps/web/README.md](/c:/Users/poyhi/project-agap/apps/web/README.md)
- Remote judging checklist: [JUDGE-CHECKLIST.md](/c:/Users/poyhi/project-agap/JUDGE-CHECKLIST.md)

## Validation

Before shipping:

```bash
pnpm run check-types
pnpm run test:native
```

For the web deployment path, also verify:

```bash
pnpm --filter web build
```

## Current Offline Model

The mobile app is built around an offline-first architecture, but the most important rule is this:

- core flows work best offline after the device has synced once while online

That means:

- resident status reporting can queue offline
- official workflows can continue using cached local data
- queued actions sync after reconnect
- live external feeds still depend on network freshness

## Documentation

- Native app guide: [apps/native/README.md](/c:/Users/poyhi/project-agap/apps/native/README.md)
- Web/API guide: [apps/web/README.md](/c:/Users/poyhi/project-agap/apps/web/README.md)
- Judge checklist: [JUDGE-CHECKLIST.md](/c:/Users/poyhi/project-agap/JUDGE-CHECKLIST.md)
