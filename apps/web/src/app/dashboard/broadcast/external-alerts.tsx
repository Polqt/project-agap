"use client";

import { useEarthquakeAlerts, usePagasaAlerts } from "./use-external-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Activity, ExternalLink, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExternalAlerts({
  onAppendNote,
}: {
  onAppendNote: (text: string) => void;
}) {
  const earthquakeQuery = useEarthquakeAlerts();
  const pagasaQuery = usePagasaAlerts();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Earthquake API */}
      <Card className="flex flex-col">
        <CardHeader className="p-4 pb-2 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            Recent Earthquakes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
          {earthquakeQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading earthquakes...</p>
          ) : earthquakeQuery.isError ? (
            <p className="text-xs text-destructive">Failed to fetch earthquakes.</p>
          ) : earthquakeQuery.data && earthquakeQuery.data.length > 0 ? (
            earthquakeQuery.data.slice(0, 5).map((eq, i) => (
              <div key={i} className="rounded-md border p-3 text-xs flex flex-col gap-2">
                <div>
                  <span className="font-semibold text-orange-600 block">
                    Magnitude {eq.magnitude}
                  </span>
                  <span className="text-muted-foreground">{eq.date_time}</span>
                </div>
                <p className="leading-snug">{eq.location.replace(/\n\s+/g, " ")}</p>
                <div className="flex justify-between items-center mt-1">
                  <a
                    href={eq.details_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    View Details <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                       onAppendNote(
                        `EQ: M${eq.magnitude} ${eq.location.replace(/\n\s+/g, " ")}`
                      );
                    }}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" /> Add to Note
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No recent earthquakes.</p>
          )}
        </CardContent>
      </Card>

      {/* PAGASA Alerts */}
      <Card className="flex flex-col">
        <CardHeader className="p-4 pb-2 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            PAGASA Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
          {pagasaQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading PAGASA alerts...</p>
          ) : pagasaQuery.isError ? (
            <p className="text-xs text-destructive">Failed to fetch PAGASA alerts.</p>
          ) : pagasaQuery.data && pagasaQuery.data.length > 0 ? (
            pagasaQuery.data.slice(0, 5).map((alert, i) => (
              <div key={i} className="rounded-md border p-3 text-xs flex flex-col gap-2">
                <div>
                  <span className="font-semibold block text-blue-600 line-clamp-2">
                    {alert.title}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(alert.updated).toLocaleString()}
                  </span>
                </div>
                {alert.capData && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Event:</strong> {alert.capData.event}</p>
                    <p><strong>Areas:</strong> {alert.capData.area}</p>
                    <p><strong>Severity:</strong> {alert.capData.severity} | <strong>Urgency:</strong> {alert.capData.urgency}</p>
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
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                        const event = alert.capData?.event || alert.title;
                        const severity = alert.capData?.severity ? 
                          alert.capData.severity === 'Severe' ? 'HIGH' : 
                          alert.capData.severity === 'Moderate' ? 'MED' : 
                          alert.capData.severity === 'Minor' ? 'LOW' : 
                          alert.capData.severity.slice(0, 3).toUpperCase() : '';
                        
                        // Include all areas without truncation
                        let areas = '';
                        if (alert.capData?.area) {
                          areas = alert.capData.area;
                        }
                        
                        const alertText = severity ? 
                          `${event} ${severity}${areas ? `-${areas}` : ''}` : 
                          `${event}${areas ? `-${areas}` : ''}`;
                        
                        onAppendNote(alertText);
                    }}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" /> Add to Note
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No active PAGASA alerts.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
