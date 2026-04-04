"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  ExternalLink,
  Radio,
  ShieldAlert,
  Thermometer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useEarthquakeAlerts, usePagasaAlerts } from "./dashboard/broadcast/use-external-alerts";

type SourcesOverviewResponse = {
  sources?: {
    philippineNewsRssFeeds?: {
      data?: {
        latest?: Array<{
          title?: string;
          link?: string;
          source?: string;
          publishedAt?: string;
        }>;
      };
    };
    weatherAdvisoryVisprsd?: {
      data?: {
        forecast?: {
          day?: string;
          night?: string;
          issuedAt?: string;
        };
      };
    };
  };
};

function formatPHT(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function severityTone(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("severe")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (normalized.includes("moderate")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  if (normalized.includes("minor")) return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  return "bg-muted text-muted-foreground";
}

function magnitudeTone(value: number) {
  if (value >= 6) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (value >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
}

export default function Home() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const pagasaQuery = usePagasaAlerts();
  const earthquakeQuery = useEarthquakeAlerts();
  const sourcesQuery = useQuery({
    queryKey: ["landing-sources-overview"],
    queryFn: async (): Promise<SourcesOverviewResponse> => {
      const response = await fetch("/api/sources/overview");
      if (!response.ok) {
        throw new Error("Failed to load overview sources");
      }
      return response.json();
    },
    refetchInterval: 300000,
  });

  const apiConnected = Boolean(healthCheck.data);
  const pagasaItems = (pagasaQuery.data ?? []).slice(0, 4);
  const earthquakeItems = (earthquakeQuery.data ?? []).slice(0, 4);
  const newsItems = sourcesQuery.data?.sources?.philippineNewsRssFeeds?.data?.latest ?? [];
  const forecast = sourcesQuery.data?.sources?.weatherAdvisoryVisprsd?.data?.forecast;

  return (
    <main className="relative min-h-full overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
        <section className="grid gap-6 rounded-3xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-6 shadow-sm lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              Mission Control Preview
            </span>

            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold leading-tight md:text-4xl">
                Barangay disaster operations, simplified.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                This landing page mirrors the admin overview with essential live signals only: advisories,
                seismic activity, forecast snippets, and system status.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button nativeButton={false} render={<Link href="/dashboard" />} className="h-10 px-4 text-sm">
                Open Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button nativeButton={false} variant="outline" render={<Link href="/login" />} className="h-10 px-4 text-sm">
                Official Login
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
            <h2 className="text-sm font-medium">System status</h2>
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
              Public preview only. Operational controls are available in the authenticated dashboard.
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PAGASA alerts</p>
            <p className="mt-1 text-3xl font-semibold leading-tight">{pagasaQuery.isLoading ? "..." : pagasaItems.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Latest flood advisories</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earthquakes</p>
            <p className="mt-1 text-3xl font-semibold leading-tight">{earthquakeQuery.isLoading ? "..." : earthquakeItems.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Recent PHIVOLCS feed items</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">News feed</p>
            <p className="mt-1 text-3xl font-semibold leading-tight">{sourcesQuery.isLoading ? "..." : newsItems.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">National and regional sources</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">API status</p>
            <p className="mt-1 text-3xl font-semibold leading-tight">
              {healthCheck.isLoading ? "..." : apiConnected ? "Online" : "Offline"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Core services heartbeat</p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-border/70 bg-background/90 p-4 xl:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold">PAGASA advisories</h2>
            </div>
            {pagasaQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading advisories...</p>
            ) : pagasaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No advisory entries right now.</p>
            ) : (
              <div className="space-y-2">
                {pagasaItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border/70 bg-muted/20 p-3 hover:bg-muted/35"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${severityTone(item.capData?.severity)}`}>
                        {item.capData?.severity || "Unknown"}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatPHT(item.updated)}</p>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border/70 bg-background/90 p-4 xl:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <Radio className="h-4 w-4 text-orange-600" />
              <h2 className="text-base font-semibold">Recent earthquakes</h2>
            </div>
            {earthquakeQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading seismic feed...</p>
            ) : earthquakeItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent earthquake items.</p>
            ) : (
              <div className="space-y-2">
                {earthquakeItems.map((item, index) => (
                  <a
                    key={`${item.details_link}-${index}`}
                    href={item.details_link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border/70 bg-muted/20 p-3 hover:bg-muted/35"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${magnitudeTone(item.magnitude)}`}>
                        M {item.magnitude}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="line-clamp-2 text-sm font-medium">{item.location.replace(/\n\s+/g, " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Depth: {item.depth_km} km</p>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border/70 bg-background/90 p-4 xl:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-cyan-600" />
              <h2 className="text-base font-semibold">Weather outlook</h2>
            </div>

            {sourcesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading forecast...</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {forecast?.day || "No day forecast available."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Night</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {forecast?.night || "No night forecast available."}
                  </p>
                </div>
                {forecast?.issuedAt ? (
                  <p className="text-xs text-muted-foreground">Issued: {forecast.issuedAt}</p>
                ) : null}
              </div>
            )}
          </article>
        </section>

        <section className="flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This is a simplified public view. For full operations (live status, registry, broadcasting, and SMS monitor),
            use the authenticated dashboard.
          </p>
        </section>
      </div>
    </main>
  );
}
