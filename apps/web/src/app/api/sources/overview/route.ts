import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

import {
  fetchPagasaAdvisories,
  PAGASA_ADVISORY_ENDPOINTS,
} from "@/lib/pagasa-advisories";

type City = {
  name: string;
  latitude: number;
  longitude: number;
};

const PAGASA_VISPRSD_URL = "https://www.pagasa.dost.gov.ph/regional-forecast/visprsd";

const CITIES: City[] = [
  { name: "Bacolod City", latitude: 10.6765, longitude: 122.9509 },
  { name: "Bago", latitude: 10.5377, longitude: 122.833 },
  { name: "Silay", latitude: 10.8, longitude: 122.9667 },
  { name: "Talisay", latitude: 10.7333, longitude: 122.9667 },
  { name: "Kabankalan", latitude: 9.9902, longitude: 122.8149 },
  { name: "Himamaylan", latitude: 10.1031, longitude: 122.8694 },
  { name: "Cadiz", latitude: 10.9465, longitude: 123.2883 },
  { name: "Sagay", latitude: 10.9447, longitude: 123.4244 },
  { name: "San Carlos", latitude: 10.4952, longitude: 123.4183 },
];

const NEWS_FEEDS = [
  { name: "Rappler", url: "https://www.rappler.com/feed/" },
  { name: "Philippine Daily Inquirer", url: "https://www.inquirer.net/feed/" },
  { name: "GMA News Online", url: "https://data.gmanetwork.com/gno/rss/news/feed.xml" },
  { name: "ABS-CBN News", url: "https://news.abs-cbn.com/feed" },
  { name: "PhilStar Global", url: "https://www.philstar.com/rss/headlines" },
  { name: "The Manila Times", url: "https://www.manilatimes.net/news/feed/" },
  { name: "Daily Tribune", url: "https://tribune.net.ph/feed" },
  { name: "BusinessWorld", url: "https://www.bworldonline.com/feed/" },
  { name: "BusinessMirror", url: "https://businessmirror.com.ph/feed/" },
  { name: "SunStar", url: "https://www.sunstar.com.ph/feed" },
  { name: "Mindanao Times", url: "https://www.mindanaotimes.com.ph/feed/" },
  { name: "Panay News", url: "https://www.panaynews.net/feed/" },
  { name: "Visayan Daily Star", url: "https://visayandailystar.com/feed/" },
] as const;

const AFARTV_STREAMS_URL = "https://www.youtube.com/@afartv/streams";
const AFARTV_CHANNEL_ID = "UCaG0IHN1RMOZ4-U3wDXAkwA";
const AFARTV_KANLAON_FALLBACK_VIDEO_ID = "JVLVCSfQLYQ";

const LIVE_NEWS_CHANNELS = [
  { name: "UNTV", channelId: "UCJrgeuVi5_C6ByQeDxUrDXQ" },
  { name: "ANC", channelId: "UCvi6hEzLM-Z_unKPSuuzKvg" },
  { name: "GMA", channelId: "UC8CdlzsNKitAxuRZqnluQng" },
  { name: "ABS-CBN", channelId: "UCE2606prvXQc_noEqKxVJXA" },
  { name: "PTV", channelId: "UCJCUbMaY593_4SN1QPG7NFQ" },
  { name: "ONE News", channelId: "UCzEAC4xGrhpShopTYgBhGJA" },
] as const;

const HAZARD_LAYER_URLS = [
  {
    key: "flood",
    name: "Flood hazard zones",
    url: "https://huggingface.co/datasets/migs360/bantay-pilipinas-hazard-maps/resolve/main/flood_nationwide.geojson",
  },
  {
    key: "landslide",
    name: "Landslide hazard zones",
    url: "https://huggingface.co/datasets/migs360/bantay-pilipinas-hazard-maps/resolve/main/landslide_nationwide.geojson",
  },
  {
    key: "stormsurge",
    name: "Storm surge hazard zones",
    url: "https://huggingface.co/datasets/migs360/bantay-pilipinas-hazard-maps/resolve/main/stormsurge_nationwide.geojson",
  },
  {
    key: "volcano",
    name: "Volcano hazard zones",
    url: "https://huggingface.co/datasets/migs360/bantay-pilipinas-hazard-maps/resolve/main/volcano_hazard_zones.geojson",
  },
  {
    key: "hospitals",
    name: "Hospitals",
    url: "https://upri-noah.s3.ap-southeast-1.amazonaws.com/critical_facilities/hospitals.geojson",
  },
  {
    key: "schools",
    name: "Schools",
    url: "https://upri-noah.s3.ap-southeast-1.amazonaws.com/critical_facilities/schools.geojson",
  },
] as const;

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^\d.+-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldUsePagasaTlsFallback(url: string, error: unknown): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const isPagasaHost = host.endsWith("pagasa.dost.gov.ph");
    if (!isPagasaHost) {
      return false;
    }

    const maybeError = error as { cause?: { code?: string }; code?: string } | null;
    const code = maybeError?.cause?.code || maybeError?.code || "";
    return code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
  } catch {
    return false;
  }
}

async function fetchTextWithInsecureTls(url: string, timeoutMs: number): Promise<string> {
  const { request } = await import("node:https");

  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);

    const req = request(
      {
        protocol: requestUrl.protocol,
        hostname: requestUrl.hostname,
        port: requestUrl.port || 443,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ProjectAGAP/1.0)",
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;

        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          fetchTextWithInsecureTls(redirectUrl, timeoutMs).then(resolve).catch(reject);
          return;
        }

        if (statusCode >= 400) {
          reject(new Error(`Request failed (${statusCode}) for ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out (${timeoutMs}ms) for ${url}`));
    });

    req.on("error", reject);
    req.end();
  });
}

async function fetchText(url: string, timeoutMs = 12000) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ProjectAGAP/1.0)",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }

    return response.text();
  } catch (error) {
    if (shouldUsePagasaTlsFallback(url, error)) {
      return fetchTextWithInsecureTls(url, timeoutMs);
    }

    throw error;
  }
}

async function fetchJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ProjectAGAP/1.0)",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

function parseHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sanitizeHtmlFragment(input: string) {
  const withBreaks = input.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");

  return parseHtmlEntities(
    withBreaks
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n"),
  );
}

type VisprsdAdvisory = {
  id: string;
  type: string;
  title: string;
  summary: string;
  issuedAt: string;
  link: string;
};

function extractVisprsdPaneContent(html: string, tabId: string): string {
  const paneMatch = html.match(
    new RegExp(
      `<div id="${tabId}"[^>]*>([\\s\\S]*?)(?=<div id="(?:rainfalls|thunderstorms|special-forecasts)"|<\\/div>\\s*<\\/div>\\s*<\\/div>)`,
      "i",
    ),
  );

  return paneMatch?.[1] ?? "";
}

function parseVisprsdTabEntries(
  html: string,
  tabId: string,
  type: string,
): VisprsdAdvisory[] {
  const paneContent = extractVisprsdPaneContent(html, tabId);
  if (!paneContent) {
    return [];
  }

  const blockMatches = [...paneContent.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)];

  if (!blockMatches.length) {
    const cleaned = sanitizeHtmlFragment(paneContent);
    if (!cleaned) {
      return [];
    }

    const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
    const title = lines[0] ?? `${type} Advisory`;
    const issuedLine = lines.find((line) => /issued at:?/i.test(line)) ?? "";
    const issuedAt = issuedLine ? issuedLine.replace(/issued at:?\s*/i, "") : "";

    return [
      {
        id: `visprsd-${tabId}-0`,
        type,
        title,
        summary: cleaned,
        issuedAt,
        link: PAGASA_VISPRSD_URL,
      },
    ];
  }

  return blockMatches
    .map((block, index) => {
      const cleaned = sanitizeHtmlFragment(block[1] ?? "");
      if (!cleaned) {
        return null;
      }

      const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
      const title = lines[0] ?? `${type} Advisory`;
      const issuedLine = lines.find((line) => /issued at:?/i.test(line)) ?? "";
      const issuedAt = issuedLine ? issuedLine.replace(/issued at:?\s*/i, "") : "";

      return {
        id: `visprsd-${tabId}-${index}`,
        type,
        title,
        summary: cleaned,
        issuedAt,
        link: PAGASA_VISPRSD_URL,
      } satisfies VisprsdAdvisory;
    })
    .filter((item): item is VisprsdAdvisory => item !== null)
    .slice(0, 6);
}

async function getVisprsdWeatherAdvisoryData() {
  const html = await fetchText(PAGASA_VISPRSD_URL, 15000);

  const regionalIssuedMatch = html.match(
    /Regional Forecast\s*<\/span>\s*<span>Issued At:\s*([^<]+)<\/span>/i,
  );
  const regionalIssuedAt = regionalIssuedMatch?.[1]?.trim() ?? "";

  const dayDescMatch = html.match(
    /<div class="regional-forecast day">[\s\S]*?<span class="description"[^>]*>([\s\S]*?)<\/span>/i,
  );
  const nightDescMatch = html.match(
    /<div class="regional-forecast night">[\s\S]*?<span class="description"[^>]*>([\s\S]*?)<\/span>/i,
  );

  const dayDesc = dayDescMatch ? sanitizeHtmlFragment(dayDescMatch[1]) : "";
  const nightDesc = nightDescMatch ? sanitizeHtmlFragment(nightDescMatch[1]) : "";

  const advisories: VisprsdAdvisory[] = [];
  const forecast = {
    day: dayDesc,
    night: nightDesc,
    issuedAt: regionalIssuedAt,
  };

  if (dayDesc || nightDesc) {
    advisories.push({
      id: "visprsd-regional-forecast",
      type: "Regional Forecast",
      title: "Visayas Regional Forecast",
      summary: [dayDesc ? `Day: ${dayDesc}` : "", nightDesc ? `Night: ${nightDesc}` : ""]
        .filter(Boolean)
        .join("\n"),
      issuedAt: regionalIssuedAt,
      link: PAGASA_VISPRSD_URL,
    });
  }

  const rainfallWarnings = parseVisprsdTabEntries(html, "rainfalls", "Rainfall Warning");
  const thunderstormWarnings = parseVisprsdTabEntries(
    html,
    "thunderstorms",
    "Thunderstorm Advisory",
  );
  const specialForecasts = parseVisprsdTabEntries(html, "special-forecasts", "Special Forecast");

  advisories.push(
    ...rainfallWarnings,
    ...thunderstormWarnings,
    ...specialForecasts,
  );

  return {
    endpoint: PAGASA_VISPRSD_URL,
    issuedAt: regionalIssuedAt,
    forecast,
    warnings: {
      rainfall: rainfallWarnings,
      thunderstorms: thunderstormWarnings,
    },
    count: advisories.length,
    advisories: advisories.slice(0, 10),
  };
}

async function getTyphoonTrackingData() {
  const endpoint = "https://pubfiles.pagasa.dost.gov.ph/tamss/weather/cyclone.dat";
  const text = await fetchText(endpoint);

  const storms: Array<{
    name: string;
    points: Array<{
      category: string;
      date: string;
      time: string;
      latitude: number;
      longitude: number;
      wind: number | null;
      timestamp: string;
    }>;
  }> = [];

  let activeStormName = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!line.includes(",")) {
      activeStormName = line;
      storms.push({ name: line, points: [] });
      continue;
    }

    if (!activeStormName || storms.length === 0) {
      continue;
    }

    const [category, date, time, lat, lon, wind] = line.split(",");
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    storms[storms.length - 1].points.push({
      category,
      date,
      time,
      latitude,
      longitude,
      wind: toNumber(wind),
      timestamp: `${date}T${time}:00+08:00`,
    });
  }

  const withLatest = storms
    .map((storm) => ({
      name: storm.name,
      pointCount: storm.points.length,
      latestPoint: storm.points[storm.points.length - 1] ?? null,
    }))
    .filter((storm) => storm.latestPoint !== null)
    .sort((a, b) => Date.parse(b.latestPoint!.timestamp) - Date.parse(a.latestPoint!.timestamp));

  return {
    endpoint,
    stormCount: withLatest.length,
    latest: withLatest[0] ?? null,
    storms: withLatest.slice(0, 5),
  };
}

async function getWaterLevelData() {
  const endpoint = "http://121.58.193.173:8080/water/main_list.do";
  const rows = await fetchJson<Array<Record<string, unknown>>>(endpoint);

  const normalized = rows
    .map((row) => {
      const wl = toNumber(row.wl);
      const critical = toNumber(row.criticalwl);
      const alarm = toNumber(row.alarmwl);
      const alert = toNumber(row.alertwl);

      let level = "normal";
      if (critical !== null && wl !== null && wl >= critical) {
        level = "critical";
      } else if (alarm !== null && wl !== null && wl >= alarm) {
        level = "alarm";
      } else if (alert !== null && wl !== null && wl >= alert) {
        level = "alert";
      }

      return {
        station: String(row.obsnm ?? "Unknown"),
        waterLevel: wl,
        alertLevel: level,
        latitude: toNumber(row.lat),
        longitude: toNumber(row.lon),
        timestamp: String(row.timestr ?? ""),
      };
    })
    .filter((row) => row.waterLevel !== null)
    .sort((a, b) => (b.waterLevel ?? 0) - (a.waterLevel ?? 0));

  return {
    endpoint,
    stationCount: normalized.length,
    criticalCount: normalized.filter((row) => row.alertLevel === "critical").length,
    topStations: normalized.slice(0, 8),
  };
}

function buildCoordinateParam(key: keyof City) {
  return CITIES.map((city) => city[key]).join(",");
}

async function getWeatherData() {
  const endpoint =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${buildCoordinateParam("latitude")}` +
    `&longitude=${buildCoordinateParam("longitude")}` +
    "&current_weather=true";

  const data = await fetchJson<Array<Record<string, any>>>(endpoint);
  const mapped = data.map((item, index) => ({
    city: CITIES[index]?.name ?? `City ${index + 1}`,
    temperatureC: item?.current_weather?.temperature ?? null,
    windspeedKmh: item?.current_weather?.windspeed ?? null,
    weatherCode: item?.current_weather?.weathercode ?? null,
    time: item?.current_weather?.time ?? null,
  }));

  return {
    endpoint,
    cityCount: mapped.length,
    cities: mapped,
  };
}

async function getAirQualityData() {
  const endpoint =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${buildCoordinateParam("latitude")}` +
    `&longitude=${buildCoordinateParam("longitude")}` +
    "&current=us_aqi,pm2_5,pm10,ozone,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,uv_index" +
    "&timezone=Asia/Manila";

  const data = await fetchJson<Array<Record<string, any>>>(endpoint);
  const mapped = data.map((item, index) => ({
    city: CITIES[index]?.name ?? `City ${index + 1}`,
    usAqi: item?.current?.us_aqi ?? null,
    pm25: item?.current?.pm2_5 ?? null,
    pm10: item?.current?.pm10 ?? null,
    time: item?.current?.time ?? null,
  }));

  return {
    endpoint,
    cityCount: mapped.length,
    highestAqi: [...mapped]
      .filter((city) => typeof city.usAqi === "number")
      .sort((a, b) => (b.usAqi ?? -1) - (a.usAqi ?? -1))[0] ?? null,
    cities: mapped,
  };
}

async function getHazardLayerData() {
  const checks = await Promise.all(
    HAZARD_LAYER_URLS.map(async (layer) => {
      try {
        const response = await fetch(layer.url, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
          next: { revalidate: 3600 },
        });

        const sizeHeader =
          response.headers.get("x-linked-size") || response.headers.get("content-length");
        return {
          ...layer,
          available: response.ok,
          sizeBytes: sizeHeader ? Number(sizeHeader) : null,
        };
      } catch {
        return {
          ...layer,
          available: false,
          sizeBytes: null,
        };
      }
    }),
  );

  return {
    endpoints: HAZARD_LAYER_URLS.map((layer) => layer.url),
    availableCount: checks.filter((layer) => layer.available).length,
    layers: checks,
  };
}

async function getNewsRssData() {
  const feedResults = await Promise.all(
    NEWS_FEEDS.map(async (feed) => {
      try {
        const xml = await fetchText(feed.url, 10000);
        const parsed = await parseStringPromise(xml, {
          explicitArray: false,
          trim: true,
        });

        const rssItem = asArray(parsed?.rss?.channel?.item)[0];
        const atomEntry = asArray(parsed?.feed?.entry)[0];

        const title =
          rssItem?.title || atomEntry?.title?._ || atomEntry?.title || "Untitled";
        const link =
          rssItem?.link || atomEntry?.link?.href || asArray(atomEntry?.link)[0]?.href || "";
        const publishedAt =
          rssItem?.pubDate || atomEntry?.updated || atomEntry?.published || "";

        if (!title || !link) {
          throw new Error("Feed entry missing title/link");
        }

        return {
          source: feed.name,
          feedUrl: feed.url,
          title: String(title),
          link: String(link),
          publishedAt: String(publishedAt),
          ok: true,
        };
      } catch {
        return {
          source: feed.name,
          feedUrl: feed.url,
          ok: false,
        };
      }
    }),
  );

  const successfulItems = feedResults.reduce<
    Array<{ source: string; feedUrl: string; title: string; link: string; publishedAt: string }>
  >((acc, item) => {
    if (item.ok && "title" in item && "link" in item && "publishedAt" in item) {
      acc.push({
        source: item.source,
        feedUrl: item.feedUrl,
        title: item.title ?? "",
        link: item.link ?? "",
        publishedAt: item.publishedAt ?? "",
      });
    }
    return acc;
  }, []);

  const latest = successfulItems
    .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
    .slice(0, 8);

  return {
    feedCount: NEWS_FEEDS.length,
    successFeedCount: latest.length,
    feeds: NEWS_FEEDS,
    latest,
  };
}

function extractYoutubeVideoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) {
        return v;
      }

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = pathParts.indexOf("embed");
      if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
        const embedId = pathParts[embedIndex + 1];
        if (/^[A-Za-z0-9_-]{11}$/.test(embedId)) {
          return embedId;
        }
      }
    }

    if (parsed.hostname === "youtu.be") {
      const shortId = parsed.pathname.replace(/^\//, "");
      if (/^[A-Za-z0-9_-]{11}$/.test(shortId)) {
        return shortId;
      }
    }
  } catch {
    // Non-URL strings are handled by regex fallback below.
  }

  const match = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

type KanlaonFeedCandidate = {
  videoId: string;
  title: string;
  publishedAt: string;
};

async function findKanlaonVideoCandidatesInFeed(
  channelId: string,
): Promise<KanlaonFeedCandidate[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const feedXml = await fetchText(feedUrl, 10000);
  const parsed = await parseStringPromise(feedXml, {
    explicitArray: false,
    trim: true,
  });

  const entries = asArray(parsed?.feed?.entry);
  const candidates: KanlaonFeedCandidate[] = [];

  for (const entry of entries) {
    const titleRaw = entry?.title?._ ?? entry?.title ?? "";
    const title = String(titleRaw);
    if (!title.toLowerCase().includes("kanlaon")) {
      continue;
    }

    const videoIdTag = String(entry?.["yt:videoId"] ?? "").trim();
    if (videoIdTag && /^[A-Za-z0-9_-]{11}$/.test(videoIdTag)) {
      candidates.push({
        videoId: videoIdTag,
        title,
        publishedAt: String(entry?.updated ?? entry?.published ?? ""),
      });
      continue;
    }

    const linkHref =
      entry?.link?.href || asArray(entry?.link)[0]?.href || "";
    const extracted = extractYoutubeVideoIdFromUrl(String(linkHref));
    if (extracted) {
      candidates.push({
        videoId: extracted,
        title,
        publishedAt: String(entry?.updated ?? entry?.published ?? ""),
      });
    }
  }

  return candidates.sort(
    (a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""),
  );
}

async function isEmbeddableYoutubeVideo(videoId: string): Promise<boolean> {
  const oembedUrl =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);

  try {
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ProjectAGAP/1.0)",
      },
      next: { revalidate: 300 },
    });

    return response.ok;
  } catch {
    return false;
  }
}

function titleLooksLikeLivestream(title: string): boolean {
  const normalized = title.toLowerCase();
  return (
    normalized.includes("live") ||
    normalized.includes("livestream") ||
    normalized.includes("live now") ||
    normalized.includes("24/7") ||
    normalized.includes("stream")
  );
}

type FeedVideoCandidate = {
  videoId: string;
  title: string;
  publishedAt: string;
};

async function getLatestChannelStream(channel: (typeof LIVE_NEWS_CHANNELS)[number]) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
  const feedXml = await fetchText(feedUrl, 10000);
  const parsed = await parseStringPromise(feedXml, {
    explicitArray: false,
    trim: true,
  });

  const entries = asArray(parsed?.feed?.entry);
  const candidates = entries
    .map((entry) => {
      const titleRaw = entry?.title?._ ?? entry?.title ?? "";
      const title = String(titleRaw).trim();
      const videoIdTag = String(entry?.["yt:videoId"] ?? "").trim();
      const linkHref = entry?.link?.href || asArray(entry?.link)[0]?.href || "";
      const extracted = extractYoutubeVideoIdFromUrl(String(linkHref));
      const videoId =
        videoIdTag && /^[A-Za-z0-9_-]{11}$/.test(videoIdTag)
          ? videoIdTag
          : extracted;

      return {
        videoId: videoId ?? "",
        title,
        publishedAt: String(entry?.updated ?? entry?.published ?? ""),
      };
    })
    .filter((item): item is FeedVideoCandidate => !!item.videoId)
    .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""));

  if (!candidates.length) {
    return null;
  }

  const ordered = [
    ...candidates.filter((item) => titleLooksLikeLivestream(item.title)),
    ...candidates.filter((item) => !titleLooksLikeLivestream(item.title)),
  ];

  for (const candidate of ordered.slice(0, 4)) {
    if (await isEmbeddableYoutubeVideo(candidate.videoId)) {
      return {
        channelId: channel.channelId,
        name: channel.name,
        youtubeVideoId: candidate.videoId,
        title: candidate.title,
        publishedAt: candidate.publishedAt,
        embedUrl: `https://www.youtube.com/embed/${candidate.videoId}`,
      };
    }
  }

  const fallback = ordered[0];
  return {
    channelId: channel.channelId,
    name: channel.name,
    youtubeVideoId: fallback.videoId,
    title: fallback.title,
    publishedAt: fallback.publishedAt,
    embedUrl: `https://www.youtube.com/embed/${fallback.videoId}`,
  };
}

async function getLiveNewsStreamsData() {
  const resolved = await Promise.all(
    LIVE_NEWS_CHANNELS.map(async (channel) => {
      try {
        return await getLatestChannelStream(channel);
      } catch {
        return null;
      }
    }),
  );

  const channels = resolved.filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    endpoint: "https://www.youtube.com/feeds/videos.xml?channel_id={channelId}",
    configuredCount: LIVE_NEWS_CHANNELS.length,
    resolvedCount: channels.length,
    channels,
  };
}

async function getVolcanoCameraData() {
  let resolvedVideoId = AFARTV_KANLAON_FALLBACK_VIDEO_ID;
  let resolvedTitle = "Kanlaon Volcano livestream";
  let resolvedPublishedAt: string | null = null;

  try {
    const candidates = await findKanlaonVideoCandidatesInFeed(AFARTV_CHANNEL_ID);

    for (const candidate of candidates) {
      if (await isEmbeddableYoutubeVideo(candidate.videoId)) {
        resolvedVideoId = candidate.videoId;
        resolvedTitle = candidate.title;
        resolvedPublishedAt = candidate.publishedAt;
        break;
      }
    }

    if (resolvedVideoId === AFARTV_KANLAON_FALLBACK_VIDEO_ID && candidates[0]) {
      resolvedVideoId = candidates[0].videoId;
      resolvedTitle = candidates[0].title;
      resolvedPublishedAt = candidates[0].publishedAt;
    }
  } catch {
    // Keep fallback if feed/oembed checks cannot be fetched.
  }

  const cameras = [
    {
      name: "Kanlaon",
      location: "Negros Occidental",
      provider: "afarTV",
      youtubeVideoId: resolvedVideoId,
      title: resolvedTitle,
      publishedAt: resolvedPublishedAt,
      sourceChannel: AFARTV_STREAMS_URL,
      embedUrl: `https://www.youtube.com/embed/${resolvedVideoId}`,
    },
  ];

  return {
    endpoint: AFARTV_STREAMS_URL,
    count: cameras.length,
    cameras,
  };
}

async function wrap<T>(task: () => Promise<T>) {
  try {
    return { ok: true as const, data: await task() };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [
    typhoonTracking,
    weatherBulletins,
    weatherAdvisoryVisprsd,
    waterLevel,
    weatherForecast,
    airQuality,
    hazardLayers,
    newsRss,
    liveNewsStreams,
    volcanoCams,
  ] = await Promise.all([
    wrap(getTyphoonTrackingData),
    wrap(fetchPagasaAdvisories),
    wrap(getVisprsdWeatherAdvisoryData),
    wrap(getWaterLevelData),
    wrap(getWeatherData),
    wrap(getAirQualityData),
    wrap(getHazardLayerData),
    wrap(getNewsRssData),
    wrap(getLiveNewsStreamsData),
    wrap(getVolcanoCameraData),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    sources: {
      typhoonTrackingPagasa: typhoonTracking,
      weatherAdvisoryVisprsd,
      weatherBulletinsPagasa: {
        ok: weatherBulletins.ok,
        endpoints: PAGASA_ADVISORY_ENDPOINTS,
        ...(weatherBulletins.ok
          ? {
              count: weatherBulletins.data.length,
              items: weatherBulletins.data,
            }
          : {
              error: weatherBulletins.error,
            }),
      },
      waterLevelMonitoringPagasaFfws: waterLevel,
      weatherForecastsOpenMeteo: weatherForecast,
      airQualityIndexOpenMeteo: airQuality,
      hazardLayersUpriNoah: hazardLayers,
      philippineNewsRssFeeds: newsRss,
      liveNewsStreamsYoutube: liveNewsStreams,
      volcanoLiveCameras: volcanoCams,
    },
  });
}
