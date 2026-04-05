# Web / API Deployment

This app hosts the `/api/trpc` backend used by the mobile app.

For tomorrow's remote judging, this is the most important deployment target.

## Recommended Host

Use `Vercel` for the deadline.

Why:

- first-class Next.js deployment
- public HTTPS URL
- fast setup for remote judging

## Required Environment Variables

Use [apps/web/.env.example](/c:/Users/poyhi/project-agap/apps/web/.env.example) as the template.

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SMS_WEBHOOK_SECRET=your-webhook-secret-min-16-chars
```

For GitLab CI to deploy to Vercel, also set these GitLab CI/CD variables:

```bash
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

Optional for SMS features:

```bash
TEXTBEE_API_KEY=your-textbee-api-key
TEXTBEE_DEVICE_ID=your-textbee-device-id
```

## Deploy Steps

1. Push the latest code to GitHub or GitLab.
2. Create a new Vercel project from the repo.
3. Set the project root directory to `apps/web`.
4. Add the environment variables above.
5. Deploy.
6. Open the deployed URL and verify the app loads.

If Vercel asks for custom commands, use the repo config in [vercel.json](/c:/Users/poyhi/project-agap/apps/web/vercel.json).

## Backend Verification

After deploy, verify these:

1. The site opens over HTTPS
2. `/api/trpc/healthCheck` responds through the deployed domain
3. Mobile sign-in works using the deployed URL
4. Broadcast, registry, dashboard, and status routes work from mobile

## Important For The Native App

After deployment, update:

```bash
apps/native/.env
```

Set:

```bash
EXPO_PUBLIC_SERVER_URL=https://your-deployed-web-domain
```

Without that, the mobile app will still try to call your laptop or an old local server.

## Production Notes

For tomorrow, this deployment is good enough for judging if:

- Supabase is already live
- migrations are applied
- the deployed URL is stable
- the mobile app is rebuilt or restarted with the new server URL
- Vercel completed a clean workspace install from the monorepo root

## Common Vercel Failure

If the build fails with `Can't resolve 'leaflet'` or `Can't resolve 'react-leaflet'`, the install step did not complete correctly for the web workspace. Run a clean root install before retrying:

```bash
pnpm install --frozen-lockfile
pnpm --filter web build
```
