# Native App Deployment

This app is the mobile client used by residents and barangay officials.

## What The Judges Need

For remote judging, the app must connect to a hosted backend, not your laptop.

Set these values in `apps/native/.env` before building:

```bash
EXPO_PUBLIC_SERVER_URL=https://your-app.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Use [apps/native/.env.example](/c:/Users/poyhi/project-agap/apps/native/.env.example) as the template.

## Important Reality Check

- Offline works only after the device has synced data at least once
- Official sign-in still needs internet unless the user already has an active saved session
- Live external feeds are not truly offline; the app shows cached data when available

## Fastest Safe Plan For Tomorrow

1. Deploy the backend first
2. Update `EXPO_PUBLIC_SERVER_URL` to the deployed URL
3. Install the app on the phone you will hand to the judges
4. Open the app online once and sign in
5. Visit the important screens so data is cached:
   - Dashboard
   - Registry
   - Broadcast
   - Welfare Check
   - Status
   - Map
   - Alerts
6. Turn airplane mode on and test offline behavior

## Recommended Pre-Judging Test

Resident flow:

1. Sign in online
2. Open `Status`, `Map`, `Check-In`, and `Alerts`
3. Turn airplane mode on
4. Send `I Am Safe` or `I Need Help`
5. Confirm the action shows as queued
6. Turn airplane mode off
7. Confirm the queue flushes

Official flow:

1. Sign in online
2. Open `Dashboard`, `Registry`, `Broadcast`, and `Welfare Check`
3. Turn airplane mode on
4. Queue a broadcast or welfare/status action
5. Confirm the UI reflects the queued action locally
6. Reconnect and confirm sync

## Local Development

```bash
pnpm run dev:native
```

For local device testing:

```bash
EXPO_PUBLIC_SERVER_URL=http://YOUR-LAPTOP-LAN-IP:3001
```

Do not use `localhost` for a physical device.

## Build Notes

For tomorrow, use whichever path you can complete fastest:

- If you already know EAS: build a preview/release Android build
- If you already have Android Studio working locally: build and install a release APK locally

The critical requirement is not the build provider. The critical requirement is:

- the app is installed on the judge device
- it points to the hosted backend
- you have already warmed the offline cache once while online

## Final Checklist Before Submission

- Hosted backend responds from outside your local network
- Mobile app can sign in against the hosted backend
- Resident and official accounts both work
- Offline queue works on a real phone
- Reconnect sync works on a real phone
- No screen still depends on your laptop IP
