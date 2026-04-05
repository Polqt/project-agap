# Project Agap

Offline-first disaster response platform built with:

- `apps/native`: Expo + React Native mobile app for residents and barangay officials
- `apps/web`: Next.js app that hosts the `/api/trpc` backend used by the mobile app
- `packages/api`: shared tRPC routers and backend logic
- `packages/db`: Supabase SQL migrations and schema

## What To Deploy For Tomorrow

For the judges' remote testing, deploy these two things:

1. A hosted `web` app so `/api/trpc` is reachable from anywhere
2. A mobile build that points `EXPO_PUBLIC_SERVER_URL` to that hosted URL

Recommended path for the deadline:

- Deploy `apps/web` to `Railway`
- Keep Supabase as the database + auth provider
- Build the native app as an Android release build or preview build

## Fast Deployment Checklist

1. Apply the latest Supabase migrations

```bash
pnpm run db:push
```

2. Deploy `apps/web` with the environment variables from [apps/web/README.md](/c:/Users/poyhi/project-agap/apps/web/README.md)

3. Change `apps/native/.env` so `EXPO_PUBLIC_SERVER_URL` points to the deployed backend

Example:

```bash
EXPO_PUBLIC_SERVER_URL=https://your-app.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

4. Build the native app for the judges

5. Test the full remote flow on a real phone:

- sign in while online
- reopen the app offline
- send a resident status ping offline
- create an official broadcast offline
- reconnect and verify queued actions sync

## Recommended Demo Strategy

Because the judges will test remotely and the deadline is tomorrow, use this order:

1. Get the hosted backend working first
2. Verify mobile login and data sync against the hosted backend
3. Prepare one Android build for judging
4. Do one final physical-device offline test after install

If you skip step 1 and only use local `--tunnel`, you can still demo, but it is riskier and easier to break during remote judging.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start local Supabase:

```bash
pnpm run supabase:start
pnpm run db:push
```

Start the backend:

```bash
pnpm run dev:web
```

Start Expo:

```bash
pnpm run dev:native
```

For physical-device local testing, set `EXPO_PUBLIC_SERVER_URL` to your laptop LAN IP, not `localhost`.

Example:

```bash
EXPO_PUBLIC_SERVER_URL=http://192.168.1.47:3001
```

## Validation Before Shipping

```bash
pnpm run check-types
pnpm run test:native
```

## Repo Structure

```text
project-agap/
├── apps/
│   ├── native/
│   └── web/
├── packages/
│   ├── api/
│   ├── auth/
│   └── db/
```

## More Docs

- Native deployment and judge checklist: [apps/native/README.md](/c:/Users/poyhi/project-agap/apps/native/README.md)
- Web/API deployment guide: [apps/web/README.md](/c:/Users/poyhi/project-agap/apps/web/README.md)
