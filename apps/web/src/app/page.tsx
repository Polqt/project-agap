"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CloudSun,
  ExternalLink,
  Radio,
  ShieldAlert,
  Thermometer,
  Tv,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { useEarthquakeAlerts, usePagasaAlerts } from "./dashboard/broadcast/use-external-alerts";

const ResidentHeatmap = dynamic(
  () => import("./dashboard/resident-heatmap").then((mod) => mod.ResidentHeatmap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[26rem] w-full" />,
  },
);

type NeedHelpPing = {
  id: string;
  resident_id: string | null;
  status: "safe" | "need_help";
  latitude: number | null;
  longitude: number | null;
  pinged_at: string;
};

type SourceEnvelope<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
};

type LiveNewsChannel = {
  channelId: string;
  name: string;
  youtubeVideoId: string;
  title: string;
  publishedAt: string;
  embedUrl: string;
};

type VolcanoCamera = {
  name: string;
  location: string;
  provider: string;
  youtubeVideoId: string;
  title: string;
  publishedAt: string | null;
  sourceChannel: string;
  embedUrl: string;
};

type SourcesOverviewResponse = {
  generatedAt?: string;
  sources: {
    philippineNewsRssFeeds?: SourceEnvelope<{
      latest: NewsItem[];
    }>;
    weatherAdvisoryVisprsd?: SourceEnvelope<{
      forecast: {
        day: string;
        night: string;
        issuedAt: string;
      };
    }>;
    liveNewsStreamsYoutube?: SourceEnvelope<{
      channels: LiveNewsChannel[];
    }>;
    volcanoLiveCameras?: SourceEnvelope<{
      cameras: VolcanoCamera[];
    }>;
  };
};

function formatPHT(date: string | null | undefined) {
  if (!date) {
    return "No timestamp";
  }

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

function panelTagClass(tone: "advisory" | "seismic" | "forecast" | "stream" | "news") {
  if (tone === "advisory") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (tone === "seismic") return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  if (tone === "forecast") return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
  if (tone === "stream") return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
  return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
}

export default function Home() {
  const [selectedLiveChannelIndex, setSelectedLiveChannelIndex] = useState(0);
  const [selectedVolcanoIndex, setSelectedVolcanoIndex] = useState(0);

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
  const heatmapQuery = useQuery({
    ...trpc.dashboard.residentHeatmap.queryOptions({}),
    refetchInterval: 30000,
  });
  const unresolvedPingsQuery = useQuery({
    ...trpc.statusPings.listUnresolved.queryOptions({}),
    refetchInterval: 15000,
  });

  const pagasaItems = (pagasaQuery.data ?? []).slice(0, 4);
  const earthquakeItems = (earthquakeQuery.data ?? []).slice(0, 4);
  const mappedResidents = heatmapQuery.data?.length ?? 0;
  const needHelpPingPoints = useMemo(
    () =>
      ((unresolvedPingsQuery.data ?? []) as NeedHelpPing[])
        .filter(
          (ping) =>
            ping.status === "need_help" &&
            ping.latitude !== null &&
            ping.longitude !== null,
        )
        .map((ping) => ({
          id: ping.id,
          resident_id: ping.resident_id,
          latitude: ping.latitude as number,
          longitude: ping.longitude as number,
          pinged_at: ping.pinged_at,
        })),
    [unresolvedPingsQuery.data],
  );
  const newsItems = sourcesQuery.data?.sources?.philippineNewsRssFeeds?.ok
    ? sourcesQuery.data.sources.philippineNewsRssFeeds.data.latest
    : [];
  const latestNews = useMemo(() => newsItems.slice(0, 8), [newsItems]);

  const weatherAdvisory = sourcesQuery.data?.sources?.weatherAdvisoryVisprsd;
  const forecast = weatherAdvisory && weatherAdvisory.ok
    ? weatherAdvisory.data.forecast
    : null;
  const liveNewsStreams = sourcesQuery.data?.sources?.liveNewsStreamsYoutube?.ok
    ? sourcesQuery.data.sources.liveNewsStreamsYoutube.data.channels
    : [];
  const volcanoCameras = sourcesQuery.data?.sources?.volcanoLiveCameras?.ok
    ? sourcesQuery.data.sources.volcanoLiveCameras.data.cameras
    : [];

  const selectedLiveChannel =
    liveNewsStreams[selectedLiveChannelIndex] ?? liveNewsStreams[0] ?? null;
  const selectedVolcano = volcanoCameras[selectedVolcanoIndex] ?? volcanoCameras[0] ?? null;

  return (
    <main className="relative min-h-full overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
        <section className="rounded-3xl border border-border/80 bg-gradient-to-br from-background via-background to-muted/30 p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
                Mission Control Overview
              </span>
              <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                National and local hazard signals in one operational feed.
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                Public mission board for advisories, seismic activity, weather outlook, and live emergency streams.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button nativeButton={false} render={<Link href="/dashboard" />} className="h-9 rounded-md px-3 text-sm">
                Open Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/dashboard/live-status" />}
                className="h-9 rounded-md px-3 text-sm"
              >
                <Activity className="h-3.5 w-3.5" />
                Live Status
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/15">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">PAGASA Alerts</p>
            <p className="mt-1 text-3xl font-semibold leading-tight text-red-700 dark:text-red-300">
              {pagasaQuery.isLoading ? "..." : pagasaItems.length}
            </p>
            <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">Latest flood advisories</p>
          </article>

          <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/15">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Earthquakes</p>
            <p className="mt-1 text-3xl font-semibold leading-tight text-amber-800 dark:text-amber-300">
              {earthquakeQuery.isLoading ? "..." : earthquakeItems.length}
            </p>
            <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">Recent PHIVOLCS events</p>
          </article>

          <article className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/40 dark:bg-cyan-900/15">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">News Feed</p>
            <p className="mt-1 text-3xl font-semibold leading-tight text-cyan-800 dark:text-cyan-300">
              {sourcesQuery.isLoading ? "..." : latestNews.length}
            </p>
            <p className="mt-1 text-xs text-cyan-800/80 dark:text-cyan-300/80">National and regional sources</p>
          </article>

        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-9">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Resident Heatmap & Active Pings</h2>
                <p className="text-sm text-muted-foreground">
                  Live density view with unresolved need-help ping overlays.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border bg-muted px-2 py-1">
                  Residents: {mappedResidents}
                </span>
                <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  Pings: {needHelpPingPoints.length}
                </span>
              </div>
            </div>
            <ResidentHeatmap
              points={heatmapQuery.data ?? []}
              needHelpPings={needHelpPingPoints}
            />
          </article>

          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-3 xl:h-[31rem] xl:overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-semibold">Ping Snapshot</h2>
            </div>
            <div className="space-y-2">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                  Active Need-Help
                </p>
                <p className="mt-1 text-2xl font-semibold text-red-700 dark:text-red-300">
                  {needHelpPingPoints.length}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mapped Residents
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {mappedResidents}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Need-help pings are shown as red pulse markers on top of the heat layer.
              </p>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[27rem] xl:overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <h2 className="text-lg font-semibold">PAGASA Advisories</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("advisory")}`}>
                ADVISORY
              </span>
            </div>

            {pagasaQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading advisories...</p>
            ) : pagasaItems.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No advisory entries right now.
              </p>
            ) : (
              <div className="mission-scroll space-y-2 xl:h-[21.5rem] xl:overflow-y-auto xl:pr-1">
                {pagasaItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-border p-3 transition-colors hover:bg-muted/35"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${severityTone(item.capData?.severity)}`}>
                        {item.capData?.severity || "Unknown"}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatPHT(item.updated)}</p>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[27rem] xl:overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <Radio className="h-4 w-4 text-orange-600" />
              <h2 className="text-lg font-semibold">Recent Earthquakes</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("seismic")}`}>
                SEISMIC
              </span>
            </div>

            {earthquakeQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading seismic feed...</p>
            ) : earthquakeItems.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No recent earthquake items.
              </p>
            ) : (
              <div className="mission-scroll space-y-2 xl:h-[21.5rem] xl:overflow-y-auto xl:pr-1">
                {earthquakeItems.map((item, index) => (
                  <a
                    key={`${item.details_link}-${index}`}
                    href={item.details_link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-border p-3 transition-colors hover:bg-muted/35"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${magnitudeTone(item.magnitude)}`}>
                        M {item.magnitude}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold">{item.location.replace(/\n\s+/g, " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Depth: {item.depth_km} km</p>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[27rem] xl:overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <CloudSun className="h-4 w-4 text-cyan-600" />
              <h2 className="text-lg font-semibold">Weather Outlook</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("forecast")}`}>
                FORECAST
              </span>
            </div>

            {sourcesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading forecast...</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-cyan-200/70 bg-cyan-50/40 p-3 dark:border-cyan-900/40 dark:bg-cyan-900/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {forecast?.day || "No day forecast available."}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800/50 dark:bg-slate-900/15">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Night</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {forecast?.night || "No night forecast available."}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Issued: {formatPHT(forecast?.issuedAt)}</p>
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[31rem] xl:overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <Wind className="h-4 w-4 text-emerald-600" />
              <h2 className="text-lg font-semibold">PH News Feed</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("news")}`}>
                NEWS
              </span>
            </div>

            {sourcesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading news feed...</p>
            ) : latestNews.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No live news entries available.
              </p>
            ) : (
              <div className="mission-scroll space-y-2 xl:h-[25rem] xl:overflow-y-auto xl:pr-1">
                {latestNews.map((item, index) => (
                  <a
                    key={`${item.link}-${index}`}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-border p-3 transition-colors hover:bg-muted/35"
                  >
                    <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.source} · {formatPHT(item.publishedAt)}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[31rem] xl:overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <Tv className="h-4 w-4 text-rose-600" />
              <h2 className="text-lg font-semibold">Live News Streams</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("stream")}`}>
                STREAM
              </span>
            </div>

            {liveNewsStreams.length > 0 && selectedLiveChannel ? (
              <>
                <div className="mb-2 flex flex-wrap gap-1">
                  {liveNewsStreams.map((channel, index) => (
                    <button
                      key={channel.channelId}
                      type="button"
                      onClick={() => setSelectedLiveChannelIndex(index)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                        selectedLiveChannel.channelId === channel.channelId
                          ? "bg-rose-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {channel.name}
                    </button>
                  ))}
                </div>

                <div className="overflow-hidden rounded-md border border-border">
                  <iframe
                    className="h-56 w-full xl:h-[21.5rem]"
                    src={selectedLiveChannel.embedUrl}
                    title={`${selectedLiveChannel.name} livestream`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                  {selectedLiveChannel.title || "Latest channel stream"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Published: {formatPHT(selectedLiveChannel.publishedAt)}
                </p>
              </>
            ) : (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No livestream entries are available right now.
              </p>
            )}
          </article>

          <article className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[31rem] xl:overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <h2 className="text-lg font-semibold">Volcano Livestream</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("stream")}`}>
                CAMERA
              </span>
            </div>

            <div className="mb-2 flex flex-wrap gap-1">
              {volcanoCameras.map((camera, index) => (
                <button
                  key={camera.youtubeVideoId}
                  type="button"
                  onClick={() => setSelectedVolcanoIndex(index)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                    selectedVolcano?.youtubeVideoId === camera.youtubeVideoId
                      ? "bg-rose-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {camera.name}
                </button>
              ))}
            </div>

            {selectedVolcano ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-md border border-border">
                  <iframe
                    className="h-56 w-full xl:h-[21.5rem]"
                    src={`https://www.youtube.com/embed/${selectedVolcano.youtubeVideoId}`}
                    title={`${selectedVolcano.name} live camera`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {selectedVolcano.title || `${selectedVolcano.name} live camera feed`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedVolcano.location} · {selectedVolcano.provider}
                </p>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Volcano camera feed is currently unavailable.
              </p>
            )}
          </article>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <p className="text-sm text-muted-foreground">
              This board is read-only. Use authenticated Mission Control for status overrides, registry updates, and broadcast operations.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
