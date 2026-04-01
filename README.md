# project-agap

This project was created with [Better Fullstack](https://github.com/Marve10s/Better-Fullstack), a modern TypeScript stack that combines Next.js, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - CSS framework
- **shadcn/ui** - UI components
- **tRPC** - End-to-end type-safe APIs
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Supabase Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/web/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.
Use the Expo Go app to run the mobile application.

## Native Connectivity

The React Native app calls the tRPC backend through the Next.js route at `/api/trpc`.
That means mobile testing needs the web app running, not just Expo.

For local development:

1. Start the web/API server:

```bash
pnpm run dev:web
```

2. Start the Expo app:

```bash
pnpm run dev:native
```

3. In `apps/native/.env`, set `EXPO_PUBLIC_SERVER_URL` to your laptop's LAN IP on port `3001`, not `localhost`.

Example:

```bash
EXPO_PUBLIC_SERVER_URL=http://192.168.1.47:3001
```

4. Make sure your phone and laptop are on the same Wi-Fi network.

5. Verify the backend from your phone browser:

```text
http://192.168.1.47:3001/api/trpc/healthCheck
```

If the mobile app uses `http://localhost:3001`, a physical phone will fail to reach the backend and screens like Alerts will show `Network request failed`.

## Project Structure

```
project-agap/
├── apps/
│   └── web/         # Fullstack application (Next.js)
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run dev:native`: Start the React Native/Expo development server
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:studio`: Open database studio UI
