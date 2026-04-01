"use client";

import { useQuery } from "@tanstack/react-query";

interface EarthquakeAlert {
  date_time: string;
  latitude: number;
  longitude: number;
  depth_km: number;
  magnitude: number;
  location: string;
  details_link: string;
}

export function useEarthquakeAlerts() {
  return useQuery({
    queryKey: ["earthquakes"],
    queryFn: async (): Promise<EarthquakeAlert[]> => {
      const response = await fetch("https://earthquakeapi.forestparty223.workers.dev/");
      if (!response.ok) throw new Error("Failed to fetch earthquake data");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export interface PagasaAlert {
  title: string;
  link: string;
  id: string;
  updated: string;
  summary: string;
  capData?: {
    event: string;
    headline: string;
    area: string;
    severity: string;
    urgency: string;
  };
}

export function usePagasaAlerts() {
  return useQuery({
    queryKey: ["pagasa-alerts"],
    queryFn: async (): Promise<PagasaAlert[]> => {
      const response = await fetch("/api/pagasa");
      if (!response.ok) throw new Error("Failed to fetch PAGASA alerts");
      return response.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}
