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
    () => points.map((point) => [point.latitude, point.longitude, 0.4] as [number, number, number]),
    [points],
  );

  useEffect(() => {
    if (!weightedPoints.length) {
      return;
    }

    const layer = heatLayerFactory(weightedPoints, {
      radius: 30,
      blur: 22,
      maxZoom: 17,
      minOpacity: 0.35,
      gradient: {
        0.2: "#fef08a",
        0.45: "#fb923c",
        0.75: "#ef4444",
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

function FitToPoints({ points }: { points: ResidentHeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    if (points.length === 1) {
      const point = points[0];
      map.setView([point.latitude, point.longitude], 15);
      return;
    }

    const bounds: LatLngBoundsExpression = points.map((point) => [point.latitude, point.longitude]);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

export function ResidentHeatmap({ points }: { points: ResidentHeatmapPoint[] }) {
  const center = points[0]
    ? ([points[0].latitude, points[0].longitude] as [number, number])
    : FALLBACK_CENTER;

  return (
    <div className="h-80 overflow-hidden rounded-lg border border-border">
      <MapContainerAny center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayerAny
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatLayer points={points} />
        <FitToPoints points={points} />
      </MapContainerAny>
    </div>
  );
}
