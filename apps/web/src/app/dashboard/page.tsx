"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CloudLightning,
  CloudRain,
  CloudSun,
  ExternalLink,
  Newspaper,
  Radio,
  Thermometer,
  Tv,
  Wind,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { useEarthquakeAlerts, usePagasaAlerts } from "./broadcast/use-external-alerts";

const ResidentHeatmap = dynamic(
  () => import("./resident-heatmap").then((mod) => mod.ResidentHeatmap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[28rem] w-full" />,
  },
);

type BroadcastItem = {
  id: string;
  broadcast_type: string;
  message: string;
  sent_at: string;
  sms_sent_count: number;
  push_sent_count: number;
};

function formatPHT(date: string | Date) {
  return new Date(date).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatIssuedLabel(value: string) {
  if (!value) {
    return "No issued timestamp";
  }

  const parsed = Date.parse(value.replace(/,/g, ""));
  return Number.isNaN(parsed) ? value : formatPHT(new Date(parsed));
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "danger" | "warning" | "success" | "neutral";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
        : tone === "success"
          ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
          : "border-border bg-card";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold leading-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function getAqiBand(aqi: number | null | undefined) {
  if (typeof aqi !== "number") return { label: "N/A", style: "bg-muted text-muted-foreground" };
  if (aqi >= 151) return { label: "Unhealthy", style: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" };
  if (aqi >= 101) return { label: "Sensitive", style: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" };
  if (aqi >= 51) return { label: "Moderate", style: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
  return { label: "Good", style: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
}

function panelTagClass(tone: "news" | "forecast" | "warning" | "seismic" | "advisory") {
  if (tone === "news") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (tone === "forecast") return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
  if (tone === "warning") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  if (tone === "seismic") return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
}

function magnitudeClass(magnitude: number) {
  if (magnitude >= 6) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (magnitude >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
}

function advisorySeverityClass(severity: string | undefined) {
  const normalized = (severity || "").toLowerCase();
  if (normalized.includes("severe")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (normalized.includes("moderate")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  if (normalized.includes("minor")) return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  return "bg-muted text-muted-foreground";
}

function advisoryTypeClass(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("thunder")) return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300";
  if (normalized.includes("rain")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (normalized.includes("forecast")) return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
  return "bg-muted text-muted-foreground";
}

function formatEarthquakeOverviewText(eq: {
  magnitude: number;
  location: string;
  depth_km: number;
  date_time: string;
}) {
  const cleanedLocation = eq.location.replace(/\n\s+/g, " ");
  const dateOnly = eq.date_time.split(" - ")[0]?.trim() || eq.date_time;
  return (
    `Magnitude: ${eq.magnitude}\n` +
    `Affected areas: ${cleanedLocation}.\n` +
    `Depth: ${eq.depth_km} km.\n` +
    `Date: ${dateOnly}.`
  );
}

function formatPagasaOverviewText(item: {
  updated: string;
  capData?: {
    severity?: string;
    urgency?: string;
    area?: string;
    rainfallForecast?: string;
  };
}) {
  const severity = item.capData?.severity || "Unknown severity";
  const urgency = item.capData?.urgency || "Unknown urgency";
  const areas = item.capData?.area || "No affected areas listed";
  const rainfall = item.capData?.rainfallForecast || "No rainfall forecast listed";

  return (
    `General Flood Advisory: ${severity} and ${urgency}.\n` +
    `Affected areas: ${areas}.\n` +
    `Rainfall: ${rainfall}.\n` +
    `Date: ${formatPHT(item.updated)}.`
  );
}

export default function DashboardPage() {
  const [selectedVolcanoIndex, setSelectedVolcanoIndex] = useState(0);
  const [selectedLiveChannelIndex, setSelectedLiveChannelIndex] = useState(0);

  const summaryQuery = useQuery({
    ...trpc.dashboard.summary.queryOptions({}),
    refetchInterval: 15000,
  });
  const heatmapQuery = useQuery({
    ...trpc.dashboard.residentHeatmap.queryOptions({}),
    refetchInterval: 30000,
  });
  const broadcastsQuery = useQuery({
    ...trpc.broadcasts.list.queryOptions({}),
    refetchInterval: 30000,
  });
  const unresolvedPingsQuery = useQuery({
    ...trpc.statusPings.listUnresolved.queryOptions({}),
    refetchInterval: 15000,
  });
  const sourcesQuery = useQuery({
    queryKey: ["dashboard-sources-overview"],
    queryFn: async () => {
      const response = await fetch("/api/sources/overview");
      if (!response.ok) {
        throw new Error("Failed to load source overview data");
      }
      return response.json();
    },
    refetchInterval: 300000,
  });

  const earthquakeQuery = useEarthquakeAlerts();
  const pagasaQuery = usePagasaAlerts();

  const summary = summaryQuery.data;
  const mappedResidents = heatmapQuery.data?.length ?? 0;
  const needHelpPingPoints = useMemo(
    () =>
      (unresolvedPingsQuery.data ?? [])
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
  const safeCount = (summary?.safe_count ?? 0) + (summary?.checked_in_count ?? 0);
  const recentBroadcasts = ((broadcastsQuery.data ?? []) as BroadcastItem[]).slice(0, 5);
  const recentEarthquakes = useMemo(() => (earthquakeQuery.data ?? []).slice(0, 6), [earthquakeQuery.data]);
  const recentPagasa = useMemo(() => (pagasaQuery.data ?? []).slice(0, 8), [pagasaQuery.data]);

  const sources = (sourcesQuery.data as any)?.sources;

  const visprsdWeather = sources?.weatherAdvisoryVisprsd?.data;
  const visprsdWeatherAdvisories = visprsdWeather?.advisories ?? [];
  const visprsdForecast = visprsdWeather?.forecast ?? null;
  const rainfallWarnings = visprsdWeather?.warnings?.rainfall ?? [];
  const thunderstormWarnings = visprsdWeather?.warnings?.thunderstorms ?? [];
  const newsItems = sources?.philippineNewsRssFeeds?.data?.latest ?? [];
  const liveNewsStreams = sources?.liveNewsStreamsYoutube?.data?.channels ?? [];
  const volcanoCameras = sources?.volcanoLiveCameras?.data?.cameras ?? [];
  const selectedVolcano =
    volcanoCameras[selectedVolcanoIndex] ?? volcanoCameras[0] ?? null;
  const selectedLiveChannel =
    liveNewsStreams[selectedLiveChannelIndex] ?? liveNewsStreams[0] ?? null;

  const weatherRows = useMemo(() => {
    const weather = sources?.weatherForecastsOpenMeteo?.data?.cities ?? [];
    const aqi = sources?.airQualityIndexOpenMeteo?.data?.cities ?? [];
    const aqiByCity = new Map(aqi.map((row: any) => [row.city, row.usAqi]));

    return weather.slice(0, 9).map((row: any) => ({
      ...row,
      usAqi: aqiByCity.get(row.city) ?? null,
    }));
  }, [sources]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Mission Control Overview</h1>
          <p className="text-base text-muted-foreground">
            National and local monitoring data in one operational view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-md px-3 text-sm"
            nativeButton={false}
            render={<Link href="/dashboard/live-status" />}
          >
            <Activity className="h-4 w-4" />
            Open Live Status
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-md px-3 text-sm"
            nativeButton={false}
            render={<Link href="/dashboard/broadcast" />}
          >
            <Bell className="h-4 w-4" />
            Send Broadcast
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryQuery.isLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard
              label="Need Help"
              value={summary?.need_help_count ?? 0}
              hint="Highest priority"
              tone="danger"
            />
            <StatCard
              label="Unaccounted"
              value={summary?.unaccounted_count ?? 0}
              hint="Needs follow-up"
              tone="warning"
            />
            <StatCard
              label="Safe / Checked In"
              value={safeCount}
              hint="Confirmed residents"
              tone="success"
            />
            <StatCard
              label="Total Households"
              value={summary?.total_households ?? 0}
              hint="Registry count"
              tone="neutral"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-9">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">Resident & Hazard Map</h2>
                    <p className="text-sm text-muted-foreground">
                      OpenStreetMap with resident density and active need-help ping overlays ({mappedResidents} mapped residents).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {weatherRows.slice(0, 6).map((city: any) => (
                      <span
                        key={city.city}
                        className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {city.city}
                      </span>
                    ))}
                  </div>
                </div>
                <ResidentHeatmap points={heatmapQuery.data ?? []} needHelpPings={needHelpPingPoints} />
              </section>

              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-3 xl:h-[34rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold">Recent Broadcasts</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-md px-2 text-xs"
                    nativeButton={false}
                    render={<Link href="/dashboard/broadcast" />}
                  >
                    View all
                  </Button>
                </div>

                {broadcastsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                ) : recentBroadcasts.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                    No broadcasts have been sent yet.
                  </p>
                ) : (
                  <div className="mission-scroll space-y-2 xl:h-[28rem] xl:overflow-y-auto xl:pr-1">
                    {recentBroadcasts.map((item) => (
                      <div key={item.id} className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.broadcast_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatPHT(item.sent_at)}</span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm">{item.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.sms_sent_count} SMS · {item.push_sent_count} push
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
      </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[27rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-lg font-semibold">PH News</h2>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("news")}`}>
                    NEWS FEED
                  </span>
                </div>
                {sourcesQuery.isLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="mission-scroll space-y-2 xl:h-[21.5rem] xl:overflow-y-auto xl:pr-1">
                    {newsItems.slice(0, 10).map((item: any, idx: number) => (
                      <a
                        key={`${item.link}-${idx}`}
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border border-border p-2 transition-colors hover:bg-muted/40"
                      >
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.source} · {item.publishedAt ? formatPHT(item.publishedAt) : "No timestamp"}
                        </p>
                      </a>
                    ))}
                    {newsItems.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground">
                        News feeds are currently unavailable.
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[27rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <CloudSun className="h-4 w-4 text-cyan-600" />
                  <h2 className="text-lg font-semibold">VISPRSD Forecast & Warnings</h2>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("forecast")}`}>
                    FORECAST
                  </span>
                </div>
                {sourcesQuery.isLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="mission-scroll space-y-2 xl:h-[21.5rem] xl:overflow-y-auto xl:pr-1">
                    {visprsdForecast?.day || visprsdForecast?.night ? (
                      <div className="rounded-md border border-cyan-200/70 bg-cyan-50/40 p-3 dark:border-cyan-900/40 dark:bg-cyan-900/10">
                        <p className="text-sm font-semibold text-foreground">Regional Forecast</p>
                        {visprsdForecast?.day ? (
                          <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Day:</span> {visprsdForecast.day}</p>
                        ) : null}
                        {visprsdForecast?.night ? (
                          <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Night:</span> {visprsdForecast.night}</p>
                        ) : null}
                        {visprsdForecast?.issuedAt ? (
                          <p className="mt-1 text-xs text-muted-foreground">Issued: {formatIssuedLabel(visprsdForecast.issuedAt)}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="rounded-md border border-blue-200/70 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
                      <div className="flex items-center gap-2">
                        <CloudRain className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-semibold text-foreground">Rainfall Warnings</p>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("warning")}`}>
                          WARNING
                        </span>
                      </div>
                      {rainfallWarnings.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {rainfallWarnings.slice(0, 3).map((item: any) => (
                            <a
                              key={item.id}
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
                            >
                              <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                              {item.issuedAt ? <p className="mt-0.5 text-xs">Issued: {formatIssuedLabel(item.issuedAt)}</p> : null}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No rainfall warning listed.</p>
                      )}
                    </div>

                    <div className="rounded-md border border-violet-200/70 bg-violet-50/40 p-3 dark:border-violet-900/40 dark:bg-violet-900/10">
                      <div className="flex items-center gap-2">
                        <CloudLightning className="h-4 w-4 text-violet-600" />
                        <p className="text-sm font-semibold text-foreground">Thunderstorm Warnings</p>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("warning")}`}>
                          WARNING
                        </span>
                      </div>
                      {thunderstormWarnings.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {thunderstormWarnings.slice(0, 3).map((item: any) => (
                            <a
                              key={item.id}
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
                            >
                              <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                              {item.issuedAt ? <p className="mt-0.5 text-xs">Issued: {formatIssuedLabel(item.issuedAt)}</p> : null}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No thunderstorm warning listed.</p>
                      )}
                    </div>

                    {!visprsdForecast?.day && !visprsdForecast?.night && rainfallWarnings.length === 0 && thunderstormWarnings.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground">
                        VISPRSD weather forecast and warnings are currently unavailable.
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[27rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-lg font-semibold">Weather & Air Quality</h2>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("forecast")}`}>
                    CITY SNAPSHOT
                  </span>
                </div>
                {sourcesQuery.isLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="mission-scroll space-y-2 xl:h-[21.5rem] xl:overflow-y-auto xl:pr-1">
                    {weatherRows.map((city: any) => {
                      const aqiBand = getAqiBand(city.usAqi);

                      return (
                        <div key={city.city} className="rounded-md border border-border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{city.city}</p>
                            <p className="text-sm font-semibold text-foreground">
                              {typeof city.temperatureC === "number" ? `${city.temperatureC}°C` : "N/A"}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${aqiBand.style}`}>
                              AQI {city.usAqi ?? "N/A"}
                            </span>
                            <span className="text-xs text-muted-foreground">{aqiBand.label}</span>
                          </div>
                        </div>
                      );
                    })}
                    {weatherRows.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground">
                        Weather and AQI feeds are currently unavailable.
                      </p>
                    ) : null}
                  </div>
                )}
              </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[25rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-orange-600" />
                  <h2 className="text-lg font-semibold">PHIVOLCS</h2>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("seismic")}`}>
                    SEISMIC
                  </span>
                </div>

                {earthquakeQuery.isLoading ? (
                  <Skeleton className="h-20" />
                ) : recentEarthquakes.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground">
                    No recent earthquake items.
                  </p>
                ) : (
                  <div className="mission-scroll space-y-2 xl:h-[20rem] xl:overflow-y-auto xl:pr-1">
                    {recentEarthquakes.map((eq, idx) => (
                      <div key={idx} className="rounded-md border border-border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${magnitudeClass(eq.magnitude)}`}>
                            M {eq.magnitude}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            PHIVOLCS Feed
                          </span>
                        </div>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                          {formatEarthquakeOverviewText(eq)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[25rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <Wind className="h-4 w-4 text-sky-600" />
                  <h2 className="text-lg font-semibold">PAGASA Weather Advisory</h2>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("advisory")}`}>
                    VISPRSD
                  </span>
                </div>

                {sourcesQuery.isLoading ? (
                  <Skeleton className="h-20" />
                ) : (
                  <div className="mission-scroll space-y-2 xl:h-[20rem] xl:overflow-y-auto xl:pr-1">
                    {visprsdWeatherAdvisories.slice(0, 8).map((item: any, idx: number) => (
                      <a
                        key={`${item.id}-${idx}`}
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border border-border p-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${advisoryTypeClass(item.type || "")}`}>
                            {item.type || "Advisory"}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {String(item.summary || "").replace(/\s+/g, " ")}
                        </p>
                        {item.issuedAt ? (
                          <p className="mt-2 text-xs text-muted-foreground">Issued: {formatIssuedLabel(item.issuedAt)}</p>
                        ) : null}
                      </a>
                    ))}
                    {visprsdWeatherAdvisories.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground">
                        No VISPRSD weather advisory entries found.
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4 xl:col-span-4 xl:h-[25rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-blue-600" />
                  <h2 className="text-lg font-semibold">PAGASA Flood Advisories</h2>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${panelTagClass("advisory")}`}>
                    GFA CAP
                  </span>
                </div>

                <div className="mission-scroll space-y-2 xl:h-[20rem] xl:overflow-y-auto xl:pr-1">
                  {recentPagasa.slice(0, 8).map((item) => (
                    <a
                      key={item.id}
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md border border-border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${advisorySeverityClass(item.capData?.severity)}`}>
                          {item.capData?.severity || "Unknown"}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {item.capData?.urgency || "Unknown urgency"}
                        </span>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {formatPagasaOverviewText(item)}
                      </p>
                    </a>
                  ))}
                  {recentPagasa.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground">
                      No active PAGASA advisories.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-4 xl:h-[31rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <Tv className="h-4 w-4 text-rose-600" />
                  <h2 className="text-base font-semibold">Livestreams</h2>
                </div>
                {liveNewsStreams.length > 0 && selectedLiveChannel ? (
                  <>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {liveNewsStreams.map((channel: any, index: number) => (
                        <button
                          key={channel.channelId}
                          type="button"
                          onClick={() => setSelectedLiveChannelIndex(index)}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                            selectedLiveChannel.channelId === channel.channelId
                              ? "bg-red-600 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {channel.name}
                        </button>
                      ))}
                    </div>

                    <div className="overflow-hidden rounded-md border border-border">
                      <iframe
                        className="h-56 w-full xl:h-[24.5rem]"
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
                      {selectedLiveChannel.publishedAt
                        ? `Published: ${formatPHT(selectedLiveChannel.publishedAt)}`
                        : "Source: YouTube channel feeds"}
                    </p>
                  </>
                ) : (
                  <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                    No livestream entries are currently available from channel feeds.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4 xl:h-[31rem] xl:overflow-hidden">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <h2 className="text-base font-semibold">Kanlaon / Volcano Livestream</h2>
                </div>

                <div className="mb-2 flex flex-wrap gap-1">
                  {volcanoCameras.map((cam: any, index: number) => (
                    <button
                      key={cam.youtubeVideoId}
                      type="button"
                      onClick={() => setSelectedVolcanoIndex(index)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                        selectedVolcano?.youtubeVideoId === cam.youtubeVideoId
                          ? "bg-red-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cam.name}
                    </button>
                  ))}
                </div>

                {selectedVolcano ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-md border border-border">
                      <iframe
                        className="h-56 w-full xl:h-[24.5rem]"
                        src={`https://www.youtube.com/embed/${selectedVolcano.youtubeVideoId}`}
                        title={`${selectedVolcano.name} live camera`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedVolcano.location} · {selectedVolcano.provider}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground">
                    Camera list is unavailable right now.
                  </p>
                )}
              </section>
            </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
          <p className="text-sm text-muted-foreground">
            Tip: Use Live Status for rapid status overrides, and keep this overview open for external situation awareness.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <a href="https://www.pagasa.dost.gov.ph/regional-forecast/visprsd" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
            PAGASA VISPRSD
            <ExternalLink className="h-3 w-3" />
          </a>
          <a href="https://publicalert.pagasa.dost.gov.ph/feeds/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
            PAGASA
            <ExternalLink className="h-3 w-3" />
          </a>
          <a href="http://121.58.193.173:8080/water/main_list.do" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
            FFWS
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>
    </div>
  );
}