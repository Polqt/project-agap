# Project Agap

Project Agap is a disaster risk reduction and response platform built for barangays, responders, and residents. It is designed for the moments when ordinary communication becomes unreliable but the need for accurate coordination becomes even more urgent.

At its core, Project Agap helps a community answer the questions that matter most during an emergency:

- Who is safe?
- Who still needs help?
- Which households remain unaccounted for?
- Where should people evacuate?
- What resources are needed right now?
- How can officials keep response moving even under weak connectivity?

## :ledger: Index

- [About](#beginner-about)
- [The Platform](#zap-the-platform)
- [Core Capabilities](#wrench-core-capabilities)
  - [Resident Safety Reporting](#resident-safety-reporting)
  - [Barangay Command And Coordination](#barangay-command-and-coordination)
  - [Emergency Communication](#emergency-communication)
  - [Evacuation Mapping And Guidance](#evacuation-mapping-and-guidance)
  - [Offline And Weak-Connectivity Resilience](#offline-and-weak-connectivity-resilience)
- [Development](#nut_and_bolt-development)
  - [Pre-Requisites](#notebook-pre-requisites)
  - [File Structure](#file_folder-file-structure)
  - [Installation](#electric_plug-installation)
  - [Commands](#package-commands)
  - [Build](#hammer-build)
  - [Deployment](#rocket-deployment)
- [Why Project Agap Matters](#star2-why-project-agap-matters)
- [Gallery](#camera-gallery)

## :beginner: About

Project Agap is not just a reporting tool. It is a coordination system built for real emergency constraints.

- it supports both residents and officials
- it bridges field action and command oversight
- it treats mapping, communication, and accountability as one integrated problem
- it remains usable during unstable network conditions
- it is tailored to barangay-level response, where timing and clarity have immediate consequences

## :zap: The Platform

Project Agap has two connected experiences:

- [Project Agap Mobile](./apps/native/README.md) — field app for residents, officials, and responders
- [Project Agap Web Command Center](./apps/web/README.md) — command surface for barangay leadership

Together, they form one emergency workflow across residents, responders, and decision-makers.

## :wrench: Core Capabilities

### Resident Safety Reporting

- one-tap `I Am Safe` and `I Need Help` status updates
- household visibility and last-ping state
- emergency reporting designed for speed and clarity

### Barangay Command And Coordination

- dashboard for accountability and response KPIs
- unresolved help queue for immediate action
- household registry and evacuation status management
- welfare assignment and follow-up tracking
- center operations, occupancy, and supplies monitoring

### Emergency Communication

- barangay-wide and purok-targeted broadcasts
- app and SMS-supported communication workflows
- communication history and delivery visibility

### Evacuation Mapping And Guidance

- evacuation center discovery
- safer-center route ranking
- traffic-aware route guidance when available
- seeded route fallback when live routing is unavailable
- offline map pack support for cached routes, alerts, and center data

### Offline And Weak-Connectivity Resilience

- local-first mobile read model
- queued write recovery when live delivery is impossible
- weak-connectivity retry before queue fallback
- conflict-aware mobile recovery for official workflows
- freshness indicators so users understand what is live, stale, or pending sync

## :nut_and_bolt: Development

### :notebook: Pre-Requisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- [EAS CLI](https://docs.expo.dev/build/setup/) (for APK builds)
- A [Supabase](https://supabase.com/) project (database + auth)
- Android Studio or a physical Android device (for local runs)

### :file_folder: File Structure

```
project-agap/
├── apps/
│   ├── native/          # Expo React Native mobile app
│   │   ├── app/         # Expo Router file-based routes
│   │   │   ├── (auth)/      # Sign-in, sign-up
│   │   │   ├── (resident)/  # Map, status, alerts, profile
│   │   │   ├── (official)/  # Dashboard, registry, broadcast, reports
│   │   │   └── (shared)/    # Check-in, welfare-check, kiosk
│   │   ├── features/    # Feature-first modules (alerts, auth, broadcast, …)
│   │   ├── providers/   # AuthProvider, QueryProvider, OfflineQueueProvider
│   │   ├── services/    # Supabase client, notifications, offline SQLite queue
│   │   ├── stores/      # TanStack Store client state
│   │   └── shared/      # Reusable components and hooks
│   └── web/             # Next.js web command center + tRPC server
├── packages/
│   ├── api/             # tRPC router (shared between native and web)
│   ├── db/              # Drizzle ORM schema and migrations
│   ├── env/             # Zod-validated environment variables
│   └── config/          # Shared TypeScript and tooling config
├── package.json
└── pnpm-workspace.yaml
```

### :electric_plug: Installation

**1. Clone the repository**

```bash
git clone https://github.com/Polqt/project-agap.git
cd project-agap
```

**2. Install dependencies**

```bash
pnpm install
```

**3. Set up environment variables**

Create `.env` files in the relevant apps. For `apps/native/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_SERVER_URL=http://localhost:3001
```

For `apps/web/.env`:

```env
DATABASE_URL=your_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**4. Push the database schema**

```bash
pnpm db:push
```

### :package: Commands

Run from the monorepo root:

```bash
pnpm install          # Install all workspace dependencies
pnpm db:push          # Push DB schema to Supabase
pnpm db:studio        # Open Drizzle Studio
```

Run from `apps/native/`:

```bash
pnpm dev              # Start Expo dev server (clears cache)
pnpm start            # Start Expo dev server
pnpm android          # Run on Android emulator or device
pnpm ios              # Run on iOS simulator
```

Run from `apps/web/`:

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server
```

### :hammer: Build

**Android APK (for distribution)**

The `eas.json` includes a `judge` profile for direct APK distribution:

```bash
cd apps/native
eas login
eas build --profile judge --platform android
```

This produces a downloadable `.apk` file — no Play Store required. The `judge` profile uses `distribution: internal` and `buildType: apk`.

**Web**

```bash
cd apps/web
pnpm build
```

### :rocket: Deployment

**Web Command Center**

The web app serves as both the Next.js frontend and the tRPC API server for the mobile app. Deploy to any Node.js-compatible host (Vercel, Railway, Render, etc.).

After deploying, set `EXPO_PUBLIC_SERVER_URL` in your EAS build secrets to point to the deployed URL before building the APK.

**Mobile**

Build and distribute the APK using EAS (see Build section above). Set environment secrets in the [Expo dashboard](https://expo.dev) under your project's **Secrets** before triggering a cloud build.

## :star2: Why Project Agap Matters

Disasters do not wait for stable internet, complete information, or ideal operating conditions. Floods, earthquakes, storms, and forced evacuations create a gap between what people need to report and what systems are still capable of receiving.

Project Agap is built to close that gap.

Instead of treating connectivity loss as a failure state, the platform is designed around continuity:

- residents can still report safety status quickly
- officials can continue operations from mobile in the field
- command staff can maintain barangay-wide visibility from the web
- map, routing, alerts, and cached records remain useful even when live services degrade
- weak connections are treated as recoverable, not immediately lost

## :camera: Gallery

> Screenshots and demo recordings of the platform in action.

- Mobile field app: [apps/native/README.md](./apps/native/README.md)
- Web command center: [apps/web/README.md](./apps/web/README.md)
