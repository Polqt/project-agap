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

// ─── Air Quality & Weather — Open-Meteo (no API key) ─────────────────────────

export type CityAirQuality = {
  city: string;
  latitude: number;
  longitude: number;
  aqi: number | null;       // US AQI
  pm25: number | null;
  pm10: number | null;
  uvIndex: number | null;
  temperature: number | null;
  weatherCode: number | null;
  windspeed: number | null;
};

// Key Philippine cities with coords
const PH_CITIES = [
  { city: "Manila", latitude: 14.5995, longitude: 120.9842 },
  { city: "Cebu", latitude: 10.3157, longitude: 123.8854 },
  { city: "Davao", latitude: 7.1907, longitude: 125.4553 },
  { city: "Iloilo", latitude: 10.7202, longitude: 122.5621 },
  { city: "Zamboanga", latitude: 6.9214, longitude: 122.0790 },
];

export async function fetchCityAirQuality(city: (typeof PH_CITIES)[number]): Promise<CityAirQuality> {
  try {
    const aqParams = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current: "us_aqi,pm2_5,pm10,uv_index",
      timezone: "Asia/Manila",
    });
    const wxParams = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current_weather: "true",
    });

    const [aqRes, wxRes] = await Promise.allSettled([
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams.toString()}`),
      fetch(`https://api.open-meteo.com/v1/forecast?${wxParams.toString()}`),
    ]);

    let aqi: number | null = null;
    let pm25: number | null = null;
    let pm10: number | null = null;
    let uvIndex: number | null = null;
    let temperature: number | null = null;
    let weatherCode: number | null = null;
    let windspeed: number | null = null;

    if (aqRes.status === "fulfilled" && aqRes.value.ok) {
      const aq = (await aqRes.value.json()) as {
        current: { us_aqi?: number; pm2_5?: number; pm10?: number; uv_index?: number };
      };
      aqi = aq.current?.us_aqi ?? null;
      pm25 = aq.current?.pm2_5 ?? null;
      pm10 = aq.current?.pm10 ?? null;
      uvIndex = aq.current?.uv_index ?? null;
    }

    if (wxRes.status === "fulfilled" && wxRes.value.ok) {
      const wx = (await wxRes.value.json()) as {
        current_weather?: { temperature?: number; weathercode?: number; windspeed?: number };
      };
      temperature = wx.current_weather?.temperature ?? null;
      weatherCode = wx.current_weather?.weathercode ?? null;
      windspeed = wx.current_weather?.windspeed ?? null;
    }

    return { city: city.city, latitude: city.latitude, longitude: city.longitude, aqi, pm25, pm10, uvIndex, temperature, weatherCode, windspeed };
  } catch {
    return { city: city.city, latitude: city.latitude, longitude: city.longitude, aqi: null, pm25: null, pm10: null, uvIndex: null, temperature: null, weatherCode: null, windspeed: null };
  }
}

export async function fetchPhCitiesAirQuality(): Promise<CityAirQuality[]> {
  return Promise.all(PH_CITIES.map(fetchCityAirQuality));
}

export function aqiLabel(aqi: number | null): { label: string; color: string; bg: string; text: string } {
  if (aqi == null) return { label: "—", color: "#94a3b8", bg: "bg-slate-100", text: "text-slate-500" };
  if (aqi <= 50) return { label: "Good", color: "#16a34a", bg: "bg-emerald-100", text: "text-emerald-700" };
  if (aqi <= 100) return { label: "Moderate", color: "#d97706", bg: "bg-amber-100", text: "text-amber-700" };
  if (aqi <= 150) return { label: "Unhealthy*", color: "#ea580c", bg: "bg-orange-100", text: "text-orange-700" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#dc2626", bg: "bg-rose-100", text: "text-rose-700" };
  return { label: "Hazardous", color: "#7c3aed", bg: "bg-purple-100", text: "text-purple-700" };
}

export function wxCodeEmoji(code: number | null): string {
  if (code == null) return "🌡";
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 9) return "🌫";
  if (code <= 19) return "🌧";
  if (code <= 29) return "⛈";
  if (code <= 39) return "🌨";
  if (code <= 49) return "🌁";
  if (code <= 59) return "🌦";
  if (code <= 69) return "🌧";
  if (code <= 79) return "❄️";
  if (code <= 84) return "🌦";
  if (code <= 99) return "⛈";
  return "🌡";
}

// ─── Philippine News RSS ──────────────────────────────────────────────────────

export type NewsCategory = "national" | "business" | "regional";

export type PhNewsArticle = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  category: NewsCategory;
  thumbnail: string | null;
  description: string;
  /** Dot color for the source badge */
  color: string;
};

const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

const NEWS_FEEDS: Array<{ source: string; url: string; category: NewsCategory; color: string }> = [
  // National
  { source: "Rappler",      url: "https://www.rappler.com/feed/",                              category: "national", color: "#0ea5e9" },
  { source: "Inquirer",     url: "https://www.inquirer.net/feed/",                             category: "national", color: "#dc2626" },
  { source: "GMA News",     url: "https://data.gmanetwork.com/gno/rss/news/feed.xml",          category: "national", color: "#d97706" },
  { source: "ABS-CBN",      url: "https://news.abs-cbn.com/feed",                             category: "national", color: "#16a34a" },
  { source: "PhilStar",     url: "https://www.philstar.com/rss/headlines",                    category: "national", color: "#16a34a" },
  { source: "Manila Times", url: "https://www.manilatimes.net/news/feed/",                    category: "national", color: "#7c3aed" },
  // Business
  { source: "BWorldOnline", url: "https://www.bworldonline.com/feed/",                        category: "business", color: "#d97706" },
  { source: "BizMirror",    url: "https://businessmirror.com.ph/feed/",                       category: "business", color: "#0ea5e9" },
  // Regional
  { source: "SunStar",      url: "https://www.sunstar.com.ph/feed",                           category: "regional", color: "#dc2626" },
  { source: "Panay News",   url: "https://www.panaynews.net/feed/",                           category: "regional", color: "#ea580c" },
  { source: "Visayan Star", url: "https://visayandailystar.com/feed/",                        category: "regional", color: "#db2777" },
];

// Parse raw RSS/Atom XML into article list (fallback when rss2json is rate-limited)
function parseRssXml(
  xml: string,
  feed: (typeof NEWS_FEEDS)[number],
): PhNewsArticle[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  const articles: PhNewsArticle[] = [];
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;

  function parseBlock(block: string) {
    const title = extractTag(block, "title").replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
    const link =
      extractTag(block, "link") ||
      /<link[^>]+href="([^"]+)"/.exec(block)?.[1] ||
      "";
    const pubDate =
      extractTag(block, "pubDate") ||
      extractTag(block, "published") ||
      extractTag(block, "updated") ||
      "";
    const description = extractTag(block, "description")
      .replace(/^<!\[CDATA\[|\]\]>$/g, "")
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 200);

    if (!title || (pubDate && Date.parse(pubDate) < cutoff)) return;
    articles.push({
      title,
      link,
      pubDate,
      source: feed.source,
      category: feed.category,
      color: feed.color,
      thumbnail: null,
      description,
    });
  }

  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) parseBlock(m[1] ?? "");
  while ((m = entryRegex.exec(xml)) !== null) parseBlock(m[1] ?? "");
  return articles;
}

async function fetchViaAllOrigins(
  feed: (typeof NEWS_FEEDS)[number],
): Promise<PhNewsArticle[]> {
  try {
    const res = await fetch(proxied(feed.url));
    if (!res.ok) return [];
    const wrapper = (await res.json()) as { contents?: string };
    if (!wrapper.contents) return [];
    return parseRssXml(wrapper.contents, feed);
  } catch {
    return [];
  }
}

async function fetchFeed(feed: (typeof NEWS_FEEDS)[number]): Promise<PhNewsArticle[]> {
  // Try rss2json first (returns clean JSON)
  try {
    const res = await fetch(`${RSS2JSON}${encodeURIComponent(feed.url)}&count=8`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        status: string;
        items?: Array<{
          title?: string;
          link?: string;
          pubDate?: string;
          thumbnail?: string;
          description?: string;
          enclosure?: { link?: string };
        }>;
      };
      if (data.status === "ok" && data.items && data.items.length > 0) {
        const cutoff = Date.now() - 48 * 60 * 60 * 1000;
        const mapped = data.items
          .filter((item) => {
            const pub = item.pubDate ? Date.parse(item.pubDate) : 0;
            return pub > cutoff;
          })
          .map((item) => ({
            title: item.title?.trim() ?? "",
            link: item.link ?? "",
            pubDate: item.pubDate ?? "",
            source: feed.source,
            category: feed.category,
            color: feed.color,
            thumbnail: item.thumbnail ?? item.enclosure?.link ?? null,
            description: item.description?.replace(/<[^>]+>/g, "").trim().slice(0, 200) ?? "",
          }));
        if (mapped.length > 0) return mapped;
      }
    }
  } catch {
    // fall through to allorigins
  }

  // Fallback: fetch raw RSS via allorigins CORS proxy + parse XML
  return fetchViaAllOrigins(feed);
}

export async function fetchPhilippineNews(): Promise<PhNewsArticle[]> {
  const results = await Promise.allSettled(NEWS_FEEDS.map(fetchFeed));
  const all: PhNewsArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  // Sort newest first
  all.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  return all.slice(0, 20);
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
