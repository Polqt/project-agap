"use client";

import { useEffect, useMemo } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import "leaflet.heat";

export type ResidentHeatmapPoint = {
  resident_id: string;
  latitude: number;
  longitude: number;
};

export type NeedHelpPingPoint = {
  id: string;
  resident_id: string | null;
  latitude: number;
  longitude: number;
  pinged_at: string;
};

type LeafletHeatLayerFactory = (
  latlngs: Array<[number, number, number?]>,
  options?: {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    minOpacity?: number;
    gradient?: Record<number, string>;
  },
) => L.Layer;

const heatLayerFactory = (L as unknown as { heatLayer: LeafletHeatLayerFactory }).heatLayer;
const MapContainerAny = MapContainer as unknown as any;
const TileLayerAny = TileLayer as unknown as any;

const FALLBACK_CENTER: [number, number] = [10.7036, 122.9501];

function HeatLayer({ points }: { points: ResidentHeatmapPoint[] }) {
  const map = useMap();

  const weightedPoints = useMemo(
    () =>
      points
        .filter(
          (point) =>
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude),
        )
        .map(
          (point) =>
            [point.latitude, point.longitude, 0.9] as [
              number,
              number,
              number,
            ],
        ),
    [points],
  );

  useEffect(() => {
    if (!weightedPoints.length) {
      return;
    }

    const layer = heatLayerFactory(weightedPoints, {
      radius: 42,
      blur: 28,
      maxZoom: 17,
      minOpacity: 0.55,
      gradient: {
        0.15: "#fef08a",
        0.4: "#fdba74",
        0.68: "#ef4444",
        1: "#7f1d1d",
      },
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, weightedPoints]);

  return null;
}

function NeedHelpPingLayer({ points }: { points: NeedHelpPingPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    const layer = L.layerGroup();

    for (const point of points) {
      const icon = L.divIcon({
        className: "need-help-ping-icon",
        html: '<span class="need-help-ping-dot"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([point.latitude, point.longitude], { icon });
      marker.bindTooltip("Need help ping", {
        direction: "top",
        offset: [0, -12],
      });
      marker.addTo(layer);
    }

    layer.addTo(map);

    return () => {
      layer.removeFrom(map);
    };
  }, [map, points]);

  return null;
}

function FitToPoints({
  points,
  needHelpPings,
}: {
  points: ResidentHeatmapPoint[];
  needHelpPings: NeedHelpPingPoint[];
}) {
  const map = useMap();

  useEffect(() => {
    const allPoints: Array<[number, number]> = [
      ...points.map((point) => [point.latitude, point.longitude] as [number, number]),
      ...needHelpPings.map((point) => [point.latitude, point.longitude] as [number, number]),
    ];

    if (!allPoints.length) {
      return;
    }

    if (allPoints.length === 1) {
      const [latitude, longitude] = allPoints[0];
      map.setView([latitude, longitude], 15);
      return;
    }

    const bounds: LatLngBoundsExpression = allPoints;
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, points, needHelpPings]);

  return null;
}

export function ResidentHeatmap({
  points,
  needHelpPings = [],
}: {
  points: ResidentHeatmapPoint[];
  needHelpPings?: NeedHelpPingPoint[];
}) {
  const hasHeatData = points.length > 0;
  const center = points[0]
    ? ([points[0].latitude, points[0].longitude] as [number, number])
    : FALLBACK_CENTER;

  return (
    <div className="relative h-[26rem] overflow-hidden rounded-xl border border-border">
      <MapContainerAny center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayerAny
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatLayer points={points} />
        <NeedHelpPingLayer points={needHelpPings} />
        <FitToPoints points={points} needHelpPings={needHelpPings} />
      </MapContainerAny>

      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border/70 bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Map Layer
        </p>
        <p className="text-sm font-medium text-foreground">
          {hasHeatData ? "Heatmap active" : "Base map only"}
        </p>
        <p className="text-xs text-red-700 dark:text-red-300">
          Need help pings: {needHelpPings.length}
        </p>
      </div>
    </div>
  );
}
