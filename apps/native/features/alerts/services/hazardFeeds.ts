// Free public hazard data feeds — no API keys required
// Sources: USGS, GDACS, PAGASA (via allorigins CORS proxy)

const CORS_PROXY = "https://api.allorigins.win/get?url=";

function proxied(url: string) {
  return `${CORS_PROXY}${encodeURIComponent(url)}`;
}

// ─── USGS Earthquakes ────────────────────────────────────────────────────────

export type UsgsEarthquake = {
  id: string;
  magnitude: number;
  place: string;
  time: number; // epoch ms
  depth: number; // km
  latitude: number;
  longitude: number;
  tsunami: number;
  sig: number;
  url: string;
};

export async function fetchPhilippineEarthquakes(): Promise<UsgsEarthquake[]> {
  const params = new URLSearchParams({
    format: "geojson",
    minlatitude: "4.5",
    maxlatitude: "21.5",
    minlongitude: "116",
    maxlongitude: "127",
    limit: "20",
    orderby: "time",
  });
  const res = await fetch(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`,
  );
  if (!res.ok) throw new Error("USGS fetch failed");
  const data = (await res.json()) as {
    features: Array<{
      id: string;
      properties: {
        mag: number;
        place: string;
        time: number;
        tsunami: number;
        sig: number;
        url: string;
      };
      geometry: { coordinates: [number, number, number] };
    }>;
  };
  return data.features.map((f) => ({
    id: f.id,
    magnitude: f.properties.mag,
    place: f.properties.place,
    time: f.properties.time,
    depth: f.geometry.coordinates[2],
    longitude: f.geometry.coordinates[0],
    latitude: f.geometry.coordinates[1],
    tsunami: f.properties.tsunami,
    sig: f.properties.sig,
    url: f.properties.url,
  }));
}

// ─── GDACS Disaster Alerts ───────────────────────────────────────────────────

export type GdacsAlert = {
  id: string;
  title: string;
  description: string;
  alertLevel: "Green" | "Orange" | "Red" | "Unknown";
  eventType: string;
  country: string;
  pubDate: string;
  latitude: number | null;
  longitude: number | null;
  link: string;
};

const PH_KEYWORDS = [
  "philippines",
  "manila",
  "mindanao",
  "visayas",
  "luzon",
  "cebu",
  "davao",
  "leyte",
  "samar",
  "palawan",
  "bicol",
  "iloilo",
  "negros",
  "panay",
];

function isPhilippines(text: string): boolean {
  const lower = text.toLowerCase();
  return PH_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractTag(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i").exec(xml);
  return match?.[1]?.trim() ?? "";
}

export async function fetchGdacsAlerts(): Promise<GdacsAlert[]> {
  const res = await fetch(proxied("https://www.gdacs.org/xml/rss.xml"));
  if (!res.ok) throw new Error("GDACS fetch failed");
  const wrapper = (await res.json()) as { contents: string };
  const xml = wrapper.contents;

  // Parse <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const alerts: GdacsAlert[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] ?? "";
    const title = extractTag(block, "title");
    const description = extractTag(block, "description");
    const country = extractTag(block, "gdacs:country");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const alertLevel = extractTag(block, "gdacs:alertlevel") as GdacsAlert["alertLevel"];
    const eventType = extractTag(block, "gdacs:eventtype");

    // geo coords
    const geoMatch = /geo:lat>([^<]+)<[^>]+>([^<]+)</.exec(block);
    const pointMatch = /georss:point>([^<]+)</.exec(block);
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (geoMatch) {
      latitude = parseFloat(geoMatch[1] ?? "");
      longitude = parseFloat(geoMatch[2] ?? "");
    } else if (pointMatch) {
      const parts = (pointMatch[1] ?? "").trim().split(" ");
      latitude = parseFloat(parts[0] ?? "");
      longitude = parseFloat(parts[1] ?? "");
    }

    // Philippines filter: by country tag, coords, or keyword
    const inPh =
      isPhilippines(country) ||
      isPhilippines(title) ||
      isPhilippines(description) ||
      (latitude != null &&
        latitude >= 4.5 &&
        latitude <= 21.5 &&
        longitude != null &&
        longitude >= 116 &&
        longitude <= 127);

    if (!inPh) continue;

    alerts.push({
      id: link || `gdacs-${pubDate}`,
      title,
      description,
      alertLevel: (["Green", "Orange", "Red"].includes(alertLevel) ? alertLevel : "Unknown") as GdacsAlert["alertLevel"],
      eventType,
      country,
      pubDate,
      latitude: isNaN(latitude ?? NaN) ? null : latitude,
      longitude: isNaN(longitude ?? NaN) ? null : longitude,
      link,
    });
  }

  return alerts;
}

// ─── PAGASA Weather Bulletin ─────────────────────────────────────────────────

export type PagasaBulletin = {
  title?: string;
  effectivity?: string;
  forecaster?: string;
  issued?: string;
  raw: Record<string, unknown>;
};

export async function fetchPagasaBulletin(): Promise<PagasaBulletin | null> {
  try {
    const res = await fetch(
      proxied("https://pubfiles.pagasa.dost.gov.ph/tamss/weather/bulletin.json"),
    );
    if (!res.ok) return null;
    const wrapper = (await res.json()) as { contents: string };
    const data = JSON.parse(wrapper.contents) as Record<string, unknown>;
    return {
      title: (data.title as string) ?? (data.BulletinTitle as string),
      effectivity: (data.effectivity as string) ?? (data.Effectivity as string),
      forecaster: (data.forecaster as string) ?? (data.Forecaster as string),
      issued: (data.issued as string) ?? (data.IssuedAt as string),
      raw: data,
    };
  } catch {
    return null;
  }
}
