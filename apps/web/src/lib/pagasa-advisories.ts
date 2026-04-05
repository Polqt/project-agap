import { parseStringPromise } from "xml2js";

export type PagasaAdvisory = {
  id: string;
  title: string;
  link: string;
  updated: string;
  summary: string;
  capData?: {
    event: string;
    headline: string;
    area: string;
    severity: string;
    urgency: string;
    status?: string;
    messageType?: string;
    responseType?: string;
    certainty?: string;
    sender?: string;
    sent?: string;
    expires?: string;
    floodAdvisory?: string;
    rainfallForecast?: string;
    watercourseStatus?: string;
    areasAffected?: string[];
    regions?: string[];
    references?: string;
    instruction?: string;
  };
};

const PAGASA_FEED_URL = "https://publicalert.pagasa.dost.gov.ph/feeds/";
const PAGASA_GFA_CAP_DIR_URL = "https://publicalert.pagasa.dost.gov.ph/output/gfa/";
const PAGASA_GFA_CAP_DIR_SORTED_URL = "https://publicalert.pagasa.dost.gov.ph/output/gfa/?C=M;O=D";
const PAGASA_BULLETIN_DIR_URL = "https://pubfiles.pagasa.dost.gov.ph/tamss/weather/bulletin/";
const PAGASA_WEATHER_DIR_URL = "https://pubfiles.pagasa.dost.gov.ph/tamss/weather/";
const PAGASA_BULLETIN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanCapText(input: string): string {
  return parseHtmlEntities(String(input || "")).replace(/\r/g, "").trim();
}

function parseFloodAdvisoryLevel(event: string, headline: string): string {
  const source = `${event} ${headline}`;
  const match = source.match(/general\s+flood\s+advisory(?:\s*\(([^)]+)\))?/i);

  if (!match) {
    return "";
  }

  return (match[1] || "General").trim();
}

function parseDescriptionInsights(description: string) {
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rainfallForecast =
    lines
      .map((line) => line.match(/12-hour rainfall forecast is\s*(.+)$/i)?.[1] || "")
      .find(Boolean)
      ?.replace(/\.$/, "") || "";

  const watercourseStatus =
    lines
      .map((line) => line.match(/WATERCOURSES\s+(.+?)\s*:\s*$/i)?.[1] || "")
      .find(Boolean)
      ?.replace(/\s+/g, " ") || "";

  const bulletAreaMentions = lines
    .filter((line) => line.startsWith("+") || line.startsWith("-"))
    .map((line) => {
      const provinceMatch = line.match(/\*\*([^*]+)\*\*/);
      return provinceMatch ? provinceMatch[1].trim() : "";
    })
    .filter(Boolean);

  return {
    rainfallForecast,
    watercourseStatus,
    bulletAreaMentions,
  };
}

function toAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  if (url.startsWith("/")) {
    return `https://publicalert.pagasa.dost.gov.ph${url}`;
  }
  return url;
}

function parseCapInfoToAdvisory(capUrl: string, capData: any): PagasaAdvisory | null {
  const alert = capData?.alert;
  const info = asArray(alert?.info)[0] ?? null;

  if (!alert || !info) {
    return null;
  }

  const updated =
    String(info?.effective || info?.onset || alert?.sent || new Date().toISOString()) ||
    new Date().toISOString();
  const event = cleanCapText(String(info?.event || ""));
  const headline = cleanCapText(String(info?.headline || info?.event || "PAGASA CAP Alert"));
  const description = cleanCapText(String(info?.description || ""));
  const instruction = cleanCapText(String(info?.instruction || ""));
  const areasFromCap = asArray(info?.area)
    .map((areaNode) => cleanCapText(String(areaNode?.areaDesc || "")))
    .filter(Boolean);

  const parameterValues = asArray(info?.parameter).map((parameterNode) => ({
    name: cleanCapText(String(parameterNode?.valueName || "")),
    value: cleanCapText(String(parameterNode?.value || "")),
  }));

  const regions = parameterValues
    .filter((parameter) => parameter.name.toLowerCase().includes("layer:"))
    .map((parameter) => parameter.value)
    .filter(Boolean);

  const insights = parseDescriptionInsights(description);
  const mergedAreas = [...new Set([...areasFromCap, ...insights.bulletAreaMentions])];

  const summaryParts = [
    insights.rainfallForecast ? `Rainfall forecast: ${insights.rainfallForecast}` : "",
    insights.watercourseStatus ? `Watercourse status: ${insights.watercourseStatus}` : "",
    mergedAreas.length > 0 ? `Areas affected: ${mergedAreas.join(", ")}` : "",
    instruction ? `Instruction: ${instruction}` : "",
  ].filter(Boolean);

  const summary = summaryParts.join("\n") || description || instruction || headline;

  return {
    id: String(alert?.identifier || capUrl),
    title: headline,
    link: capUrl,
    updated,
    summary,
    capData: {
      event,
      headline,
      area: mergedAreas.join(", "),
      severity: cleanCapText(String(info?.severity || "Unknown")),
      urgency: cleanCapText(String(info?.urgency || "Unknown")),
      status: cleanCapText(String(alert?.status || "")),
      messageType: cleanCapText(String(alert?.msgType || "")),
      responseType: cleanCapText(String(info?.responseType || "")),
      certainty: cleanCapText(String(info?.certainty || "")),
      sender: cleanCapText(String(alert?.sender || info?.senderName || "")),
      sent: cleanCapText(String(alert?.sent || "")),
      expires: cleanCapText(String(info?.expires || "")),
      floodAdvisory: parseFloodAdvisoryLevel(event, headline),
      rainfallForecast: insights.rainfallForecast,
      watercourseStatus: insights.watercourseStatus,
      areasAffected: mergedAreas,
      regions,
      references: cleanCapText(String(alert?.references || "")),
      instruction,
    },
  };
}

async function parseCapFile(capUrl: string): Promise<PagasaAdvisory | null> {
  try {
    const capXml = await fetchText(capUrl, 8000);
    const capData = await parseStringPromise(capXml, {
      explicitArray: false,
      trim: true,
      mergeAttrs: true,
    });

    return parseCapInfoToAdvisory(capUrl, capData);
  } catch {
    return null;
  }
}

function extractCapLinksFromDirectoryHtml(html: string, baseUrl: string): string[] {
  const matches = [...html.matchAll(/href="([^"]+\.cap)"/gi)];
  const unique = new Set<string>();

  for (const match of matches) {
    const href = match[1] ?? "";
    const fullUrl = href.startsWith("http")
      ? href
      : new URL(href, baseUrl).toString();
    if (fullUrl) {
      unique.add(fullUrl);
    }
  }

  return [...unique];
}

function parseApacheDirectoryTimestampToIso(datePart: string, timePart: string): string | null {
  const match = datePart.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) {
    return null;
  }

  const monthIndexByName: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  const day = Number(match[1]);
  const month = monthIndexByName[match[2].toLowerCase()];
  const year = Number(match[3]);
  const timeMatch = timePart.match(/^(\d{2}):(\d{2})$/);

  if (month === undefined || !timeMatch) {
    return null;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  // PAGASA directory timestamps are in PHT (UTC+8).
  const utcMillis = Date.UTC(year, month, day, hours - 8, minutes, 0, 0);
  return Number.isNaN(utcMillis) ? null : new Date(utcMillis).toISOString();
}

async function fetchGfaCapAdvisories(): Promise<PagasaAdvisory[]> {
  const html = await fetchText(PAGASA_GFA_CAP_DIR_SORTED_URL, 15000);
  const rowRegex =
    /href="([^"]+\.cap)"[^>]*>[^<]*<\/a><\/td><td align="right">\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\s+(\d{2}:\d{2})/gi;

  const rows: Array<{ capUrl: string; listedUpdated: string }> = [];
  let match = rowRegex.exec(html);

  while (match) {
    const href = match[1] ?? "";
    const datePart = match[2] ?? "";
    const timePart = match[3] ?? "";
    const listedUpdated =
      parseApacheDirectoryTimestampToIso(datePart, timePart) || new Date(0).toISOString();

    rows.push({
      capUrl: new URL(href, PAGASA_GFA_CAP_DIR_URL).toString(),
      listedUpdated,
    });

    match = rowRegex.exec(html);
  }

  if (!rows.length) {
    return [];
  }

  rows.sort((a, b) => Date.parse(b.listedUpdated) - Date.parse(a.listedUpdated));

  const advisories = (
    await Promise.all(rows.slice(0, 30).map((row) => parseCapFile(row.capUrl)))
  ).filter((item): item is PagasaAdvisory => item !== null);

  const gfaOnly = advisories.filter((item) => {
    const haystack = `${item.title} ${item.summary} ${item.capData?.event || ""}`.toLowerCase();
    return haystack.includes("general flood advisory") || haystack.includes("flood");
  });

  return gfaOnly
    .sort((a, b) => Date.parse(b.updated || "") - Date.parse(a.updated || ""))
    .slice(0, 10);
}

async function scrapeCapAlertsFromDirectory(directoryUrl: string): Promise<PagasaAdvisory[]> {
  const html = await fetchText(directoryUrl, 12000);
  const capLinks = extractCapLinksFromDirectoryHtml(html, directoryUrl).slice(0, 20);

  if (!capLinks.length) {
    return [];
  }

  const advisories = (
    await Promise.all(capLinks.map((capLink) => parseCapFile(capLink)))
  ).filter((item): item is PagasaAdvisory => item !== null);

  return advisories
    .sort((a, b) => Date.parse(b.updated || "") - Date.parse(a.updated || ""))
    .slice(0, 8);
}

async function fetchText(url: string, timeoutMs = 12000) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ProjectAGAP/1.0)",
      },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }

    return response.text();
  } catch (error) {
    // PAGASA occasionally serves an incomplete TLS chain; apply a narrow fallback for this host only.
    if (shouldUsePagasaTlsFallback(url, error)) {
      return fetchTextWithInsecureTls(url, timeoutMs);
    }

    throw error;
  }
}

function parseBulletinDirectory(html: string): PagasaAdvisory[] {
  const rows: Array<{ href: string; updated: string }> = [];

  // Bulletin index formatting can vary (extra spaces/newlines, wrapping), so parse by
  // scanning each PDF anchor and then finding the nearest date/time in trailing text.
  const anchorRegex = /<a\s+href="([^"]+\.pdf)"[^>]*>[^<]*<\/a>([\s\S]{0,220})/gi;
  let match = anchorRegex.exec(html);

  while (match) {
    const href = match[1] ?? "";
    const trailing = match[2] ?? "";
    const dateMatch = trailing.match(/(\d{2}-[A-Za-z]{3}-\d{4})\s+(\d{2}:\d{2})/);

    rows.push({
      href,
      updated: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : "",
    });

    match = anchorRegex.exec(html);
  }

  const parsed = rows
    .map((row) => {
      const decodedName = decodeURIComponent(row.href);
      const title = decodedName
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const parsedDate = Date.parse(row.updated);
      const updatedIso = Number.isNaN(parsedDate)
        ? row.updated || new Date().toISOString()
        : new Date(parsedDate).toISOString();

      return {
        id: decodedName,
        title,
        link: `${PAGASA_BULLETIN_DIR_URL}${row.href}`,
        updated: updatedIso,
        summary: "Tropical Cyclone Bulletin (PDF)",
      } satisfies PagasaAdvisory;
    })
    .sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));

  const now = Date.now();
  const freshOnly = parsed.filter((item) => {
    const ts = Date.parse(item.updated);
    return !Number.isNaN(ts) && now - ts <= PAGASA_BULLETIN_MAX_AGE_MS;
  });

  return freshOnly.slice(0, 8);
}

async function parsePagasaAtomFeed(xmlText: string): Promise<PagasaAdvisory[]> {
  const xmlData = await parseStringPromise(xmlText, {
    explicitArray: false,
    trim: true,
    mergeAttrs: true,
  });

  const feed = xmlData?.feed;
  const entries = asArray(feed?.entry);

  const advisories = await Promise.all(
    entries.map(async (entry): Promise<PagasaAdvisory> => {
      const links = asArray(entry?.link);
      const alternateHref =
        links.find((link) => link?.rel === "alternate")?.href ||
        links[0]?.href ||
        "";

      const advisory: PagasaAdvisory = {
        id: entry?.id || entry?.updated || alternateHref,
        title: parseHtmlEntities(entry?.title || "PAGASA Advisory"),
        link: toAbsoluteUrl(alternateHref),
        updated: entry?.updated || new Date().toISOString(),
        summary: parseHtmlEntities(entry?.summary || ""),
      };

      const capLinkRaw =
        links.find(
          (link) =>
            String(link?.href || "").toLowerCase().endsWith(".cap") ||
            String(link?.type || "").toLowerCase().includes("cap"),
        )?.href || "";

      const capLink = toAbsoluteUrl(capLinkRaw);

      if (!capLink) {
        return advisory;
      }

      try {
        const parsedCap = await parseCapFile(capLink);

        if (parsedCap?.capData) {
          advisory.capData = parsedCap.capData;
          if (!advisory.summary && parsedCap.capData.headline) {
            advisory.summary = parsedCap.capData.headline;
          }
        }
      } catch {
        // Keep base advisory data when CAP payload is unavailable.
      }

      return advisory;
    }),
  );

  return advisories.slice(0, 8);
}

export async function fetchPagasaAdvisories(): Promise<PagasaAdvisory[]> {
  // Preferred source: PAGASA General Flood Advisory CAP files.
  try {
    const gfaCaps = await fetchGfaCapAdvisories();
    if (gfaCaps.length > 0) {
      return gfaCaps;
    }
  } catch {
    // Continue to CAP/legacy fallbacks.
  }

  try {
    const feedXml = await fetchText(PAGASA_FEED_URL);
    const fromFeed = await parsePagasaAtomFeed(feedXml);

    if (fromFeed.length > 0) {
      return fromFeed;
    }
  } catch {
    // Fall through to CAP directory and bulletin fallbacks.
  }

  // CAP-list scraping fallback (if CAP files are published via directory listing).
  for (const capDirUrl of [PAGASA_BULLETIN_DIR_URL, PAGASA_WEATHER_DIR_URL]) {
    try {
      const fromCapDirectory = await scrapeCapAlertsFromDirectory(capDirUrl);
      if (fromCapDirectory.length > 0) {
        return fromCapDirectory;
      }
    } catch {
      // Continue to next source.
    }
  }

  try {
    const bulletinHtml = await fetchText(PAGASA_BULLETIN_DIR_URL);
    return parseBulletinDirectory(bulletinHtml);
  } catch {
    return [];
  }
}

export const PAGASA_ADVISORY_ENDPOINTS = [
  PAGASA_GFA_CAP_DIR_URL,
  PAGASA_GFA_CAP_DIR_SORTED_URL,
  PAGASA_FEED_URL,
  PAGASA_BULLETIN_DIR_URL,
  PAGASA_WEATHER_DIR_URL,
] as const;
