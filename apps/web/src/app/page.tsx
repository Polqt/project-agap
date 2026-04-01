"use client";
import type { LucideIcon } from "lucide-react";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, BellRing, ClipboardList, ShieldAlert, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";

const PLATFORM_FEATURES: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Live Status Tracking",
    description: "Monitor household safety and needs as situations evolve.",
    icon: Activity,
  },
  {
    title: "Targeted Broadcast",
    description: "Send clear, rapid advisories to communities and responders.",
    icon: BellRing,
  },
  {
    title: "Household Registry",
    description: "Maintain updated resident records for faster interventions.",
    icon: ClipboardList,
  },
  {
    title: "Coordinated Operations",
    description: "Keep officials aligned through a shared command dashboard.",
    icon: Users,
  },
];

export default function Home() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const apiConnected = !!healthCheck.data;

  return (
    <main className="relative h-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
        <section className="grid gap-6 rounded-3xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              Project AGAP
            </span>

            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold leading-tight md:text-4xl">
                Disaster response platform for barangay command teams.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Coordinate alerts, verify household safety, and prioritize aid in one shared, real-time workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button nativeButton={false} render={<Link href="/login" />} className="h-10 px-4 text-sm">
                Open Command Portal
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button nativeButton={false} variant="outline" render={<Link href="/dashboard" />} className="h-10 px-4 text-sm">
                Go to Dashboard
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
            <h2 className="text-sm font-medium">System Status</h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  healthCheck.isLoading
                    ? "animate-pulse bg-muted-foreground"
                    : apiConnected
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {healthCheck.isLoading
                  ? "Checking API connectivity"
                  : apiConnected
                    ? "API connected and operational"
                    : "API disconnected - investigate service health"}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This portal is intended for verified barangay officials and emergency operations personnel.
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PLATFORM_FEATURES.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-border/70 bg-background/85 p-4">
              <Icon className="mb-3 h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
