import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

export async function GET() {
  try {
    console.log("Fetching PAGASA feed...");
    const response = await fetch("https://publicalert.pagasa.dost.gov.ph/feeds/", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProjectAGAP/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`PAGASA API returned ${response.status}`);
      throw new Error(`PAGASA API returned ${response.status}`);
    }

    const text = await response.text();
    console.log("PAGASA feed length:", text.length);
    console.log("PAGASA feed preview:", text.substring(0, 500));
    
    // Parse XML using xml2js
    const xmlData = await parseStringPromise(text, { explicitArray: false });
    console.log("Parsed XML structure:", Object.keys(xmlData));
    
    let feedData;
    if (xmlData.feed) {
      // Atom format
      feedData = xmlData.feed;
    } else if (xmlData.rss) {
      // RSS format
      feedData = xmlData.rss.channel;
    } else {
      throw new Error("Unknown XML format");
    }
    
    const entries = Array.isArray(feedData.entry) ? feedData.entry : [feedData.entry].filter(Boolean);
    console.log("Found entries:", entries.length);
    
    const alerts: any[] = [];
    
    for (const entry of entries.slice(0, 5)) {
      const title = entry.title || "Unknown Alert";
      const link = entry.link?.$?.href || entry.link || "";
      console.log("Processing alert:", title, "Link:", link);
      
      const id = entry.id || entry.guid || "";
      const updated = entry.updated || entry.pubDate || "";
      const summary = entry.summary || entry.description || "";

      let capData;
      if (link) {
        try {
          console.log("Fetching CAP data from:", link);
          const capResponse = await fetch(link, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ProjectAGAP/1.0)',
            },
          });
          if (capResponse.ok) {
            const capText = await capResponse.text();
            console.log("CAP data length:", capText.length);
            console.log("CAP data preview:", capText.substring(0, 200));
            
            const capXml = await parseStringPromise(capText, { explicitArray: false });
            const alert = capXml.alert;
            if (alert) {
              const info = alert.info;
              capData = {
                event: info?.event || "",
                headline: info?.headline || "",
                area: Array.isArray(info?.area) 
                  ? info.area.map((a: any) => a.areaDesc).join(", ")
                  : info?.area?.areaDesc || "",
                severity: info?.severity || "",
                urgency: info?.urgency || "",
              };
              console.log("Parsed CAP data:", capData);
            } else {
              console.log("No alert element found in CAP");
            }
          } else {
            console.log("CAP fetch failed with status:", capResponse.status);
          }
        } catch (error) {
          console.warn("Failed to fetch CAP data for", link, error);
        }
      }

      alerts.push({ title, link, id, updated, summary, capData });
    }

    console.log("Returning", alerts.length, "alerts");
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("PAGASA fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch PAGASA alerts" }, { status: 500 });
  }
}