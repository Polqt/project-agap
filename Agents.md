# project-agap

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Typescript

## Tech Stack

- **Runtime**: none
- **Package Manager**: pnpm

### Frontend

- Framework: next, native-uniwind
- CSS: tailwind
- UI Library: shadcn-ui
- State: tanstack-store

### Backend

- Framework: self
- API: trpc
- Validation: zod

### Database

- Database: postgres
- ORM: drizzle

### Authentication

- Provider: supabase-auth

### Additional Features

- Testing: vitest-playwright
- AI: vercel-ai

## Project Structure

```
project-agap/
├── apps/
│   ├── web/         # Frontend application
│   ├── native/      # Mobile application (React Native)
├── packages/
│   ├── api/         # API layer
│   ├── auth/        # Authentication
│   └── db/          # Database schema
```

## Common Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm dev:web` - Start the Next.js app that serves the `/api/trpc` backend on port 3001
- `pnpm dev:native` - Start the Expo React Native app
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm db:push` - Push database schema
- `pnpm db:studio` - Open database UI

## Local Mobile Connectivity

- The native app reaches the backend through the Next.js tRPC route in `apps/web/src/app/api/trpc/[trpc]/route.ts`
- For physical-device testing, `apps/native/.env` must set `EXPO_PUBLIC_SERVER_URL` to the laptop's LAN IP, not `localhost`
- Mobile testing requires both the web server and Expo dev server to be running

## Maintenance

Keep Agents.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.
