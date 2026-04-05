"use client";

import { useEarthquakeAlerts, usePagasaAlerts } from "./use-external-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Activity, Clock3, ExternalLink, MapPin, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function magnitudeClass(magnitude: number) {
  if (magnitude >= 6) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (magnitude >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
}

function severityClass(value?: string) {
  const severity = (value || "").toLowerCase();
  if (severity.includes("severe")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (severity.includes("moderate")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  if (severity.includes("minor")) return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  return "bg-muted text-muted-foreground";
}

function urgencyClass(value?: string) {
  const urgency = (value || "").toLowerCase();
  if (urgency.includes("immediate")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (urgency.includes("expected")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

export function ExternalAlerts({
  onAppendNote,
}: {
  onAppendNote: (text: string) => void;
}) {
  const earthquakeQuery = useEarthquakeAlerts();
  const pagasaQuery = usePagasaAlerts();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* Earthquake API */}
      <Card className="flex flex-col border-border/70">
        <CardHeader className="border-b border-border/70 p-4 pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
            <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            Recent Earthquakes
            </span>
            <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
              PHIVOLCS
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[340px] space-y-3 overflow-y-auto p-4">
          {earthquakeQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading earthquakes...</p>
          ) : earthquakeQuery.isError ? (
            <p className="text-sm text-destructive">Failed to fetch earthquakes.</p>
          ) : earthquakeQuery.data && earthquakeQuery.data.length > 0 ? (
            earthquakeQuery.data.slice(0, 5).map((eq, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${magnitudeClass(eq.magnitude)}`}>
                    Magnitude {eq.magnitude}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    {eq.date_time}
                  </span>
                </div>
                <p className="inline-flex items-start gap-1.5 leading-snug">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{eq.location.replace(/\n\s+/g, " ")}</span>
                </p>
                <div className="flex justify-between items-center mt-1">
                  <a
                    href={eq.details_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    View Details <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-md px-2.5 text-xs"
                    onClick={() => {
                      const cleanedLocation = eq.location.replace(/\n\s+/g, " ");
                      onAppendNote(
                        `Magnitude: ${eq.magnitude}\n` +
                        `Affected areas: ${cleanedLocation}.\n` +
                        `Depth: ${eq.depth_km} km; Time: ${eq.date_time}.`,
                      );
                    }}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" /> Add to Note
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No recent earthquakes.</p>
          )}
        </CardContent>
      </Card>

      {/* PAGASA Alerts */}
      <Card className="flex flex-col border-border/70">
        <CardHeader className="border-b border-border/70 p-4 pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
            <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            PAGASA Alerts
            </span>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              CAP Feed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[340px] space-y-3 overflow-y-auto p-4">
          {pagasaQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading PAGASA alerts...</p>
          ) : pagasaQuery.isError ? (
            <p className="text-sm text-destructive">Failed to fetch PAGASA alerts.</p>
          ) : pagasaQuery.data && pagasaQuery.data.length > 0 ? (
            pagasaQuery.data.slice(0, 5).map((alert, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                <div>
                  <span className="font-semibold block text-blue-600 line-clamp-2">
                    {alert.title}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(alert.updated).toLocaleString()}
                  </span>
                </div>
                {alert.capData && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${severityClass(alert.capData.severity)}`}>
                        {alert.capData.severity || "Unknown severity"}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${urgencyClass(alert.capData.urgency)}`}>
                        {alert.capData.urgency || "Unknown urgency"}
                      </span>
                    </div>
                    <p><strong>Event:</strong> {alert.capData.event}</p>
                    {alert.capData.floodAdvisory ? (
                      <p><strong>Flood advisory:</strong> {alert.capData.floodAdvisory}</p>
                    ) : null}
                    {alert.capData.status ? (
                      <p><strong>Status:</strong> {alert.capData.status}</p>
                    ) : null}
                    {alert.capData.watercourseStatus ? (
                      <p><strong>Watercourse:</strong> {alert.capData.watercourseStatus}</p>
                    ) : null}
                    {alert.capData.rainfallForecast ? (
                      <p><strong>Rainfall:</strong> {alert.capData.rainfallForecast}</p>
                    ) : null}
                    <p><strong>Areas:</strong> {alert.capData.area || "N/A"}</p>
                  </div>
                )}
                <div className="flex justify-between items-center mt-1">
                  <a
                    href={alert.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    View Details <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-md px-2.5 text-xs"
                    onClick={() => {
                        const severity = alert.capData?.severity || "Unknown severity";
                        const urgency = alert.capData?.urgency || "Unknown urgency";
                        const areas = alert.capData?.area || "No affected areas listed";
                        const rainfall = alert.capData?.rainfallForecast || "No rainfall forecast listed";

                        const alertText =
                          `General Flood Advisory: ${severity} and ${urgency}.\n` +
                          `Affected areas: ${areas}.\n` +
                          `Rainfall: ${rainfall}.`;

                        onAppendNote(alertText);
                    }}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" /> Add to Note
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No active PAGASA alerts.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
