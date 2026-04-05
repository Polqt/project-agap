# Web / API Deployment

This app hosts the `/api/trpc` backend used by the mobile app.

For tomorrow's remote judging, this is the most important deployment target.

## Recommended Host

Use `Railway` for the deadline.

Why:

- simple Next.js deployment
- public HTTPS URL
- easier remote testing than laptop tunnel

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

Optional for SMS features:

```bash
TEXTBEE_API_KEY=your-textbee-api-key
TEXTBEE_DEVICE_ID=your-textbee-device-id
```

## Deploy Steps

1. Push the latest code to GitHub
2. Create a new Railway project from the repo
3. Set the root directory to `apps/web` if Railway asks
4. Add the environment variables above
5. Deploy
6. Open the deployed URL and verify the app loads

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
