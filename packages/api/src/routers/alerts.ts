import { z } from "zod";
import { parseStringPromise } from "xml2js";

import {
  getAuthorizedBarangayId,
  getFoundOrThrow,
  getProfileOrThrow,
  getProfileBarangayIdOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { TRPCError } from "@trpc/server";
import { ApiError } from "../errors";
import { officialProcedure, protectedProcedure, router } from "../index";
import { uuidSchema } from "../schemas";
import type { Alert, TableInsert } from "../supabase";

const alertColumns =
  "id, barangay_id, source, severity, hazard_type, title, title_filipino, body, body_filipino, signal_level, recommended_actions, recommended_actions_filipino, source_url, issued_at, expires_at, is_active, external_id, created_at";

function isAlertExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() < Date.now();
}

function isAlertVisibleToBarangay(alert: Alert, barangayId: string) {
  if (!alert.is_active || isAlertExpired(alert.expires_at)) {
    return false;
  }

  return alert.barangay_id === null || alert.barangay_id === barangayId;
}

export const alertsRouter = router({
  getById: protectedProcedure
    .input(
      z.object({
        id: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getProfileBarangayIdOrThrow(profile);

      const alert = getFoundOrThrow<Alert | null>(
        getSupabaseDataOrThrow<Alert | null>(
          await ctx.supabase
            .from("alerts")
            .select(alertColumns)
            .eq("id", input.id)
            .maybeSingle(),
          "Failed to load alert.",
        ),
        "Alert not found.",
      );

      if (!isAlertVisibleToBarangay(alert, barangayId)) {
        throw ApiError.notFound("Alert not found.");
      }

      return alert;
    }),

  listActive: protectedProcedure
    .input(
      z.object({
        barangayId: uuidSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = getProfileOrThrow(ctx.profile);
      const barangayId = getAuthorizedBarangayId(profile, input.barangayId);

      const alerts =
        getSupabaseDataOrThrow<Alert[]>(
        await ctx.supabase
          .from("alerts")
          .select(alertColumns)
          .eq("is_active", true)
          .or(`barangay_id.eq.${barangayId},barangay_id.is.null`)
          .order("issued_at", { ascending: false }),
        "Failed to list active alerts.",
        ) ?? [];

      return alerts.filter((alert) => !isAlertExpired(alert.expires_at));
    }),

  createManual: officialProcedure
    .input(
      z.object({
        severity: z.enum(["info", "advisory", "watch", "warning", "danger"]).default("info"),
        hazardType: z.string().trim().min(1).max(100),
        title: z.string().trim().min(1).max(160),
        titleFilipino: z.string().trim().max(160).nullish(),
        body: z.string().trim().min(1).max(5000),
        bodyFilipino: z.string().trim().max(5000).nullish(),
        signalLevel: z.string().trim().max(100).nullish(),
        recommendedActions: z.string().trim().max(2000).nullish(),
        recommendedActionsFilipino: z.string().trim().max(2000).nullish(),
        sourceUrl: z.string().url().nullish(),
        issuedAt: z.string().datetime({ offset: true }).optional(),
        expiresAt: z.string().datetime({ offset: true }).nullish(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const insertPayload: TableInsert<"alerts"> = {
        barangay_id: getProfileBarangayIdOrThrow(ctx.profile),
        source: "manual",
        severity: input.severity,
        hazard_type: input.hazardType,
        title: input.title,
        title_filipino: input.titleFilipino ?? null,
        body: input.body,
        body_filipino: input.bodyFilipino ?? null,
        signal_level: input.signalLevel ?? null,
        recommended_actions: input.recommendedActions ?? null,
        recommended_actions_filipino: input.recommendedActionsFilipino ?? null,
        ...(input.sourceUrl !== undefined ? { source_url: input.sourceUrl } : {}),
        ...(input.issuedAt !== undefined ? { issued_at: input.issuedAt } : {}),
        ...(input.expiresAt !== undefined ? { expires_at: input.expiresAt } : {}),
        is_active: input.isActive,
      };

      const alert = getFoundOrThrow<Alert | null>(
        getSupabaseDataOrThrow<Alert | null>(
          await ctx.supabase
            .from("alerts")
            .insert(insertPayload)
            .select(alertColumns)
            .maybeSingle(),
          "Failed to create manual alert.",
        ),
        "Manual alert creation failed.",
      );

      return alert;
    }),

  ingestPagasa: officialProcedure.mutation(async ({ ctx }) => {
    const PAGASA_FEED_URL = "https://publicalert.pagasa.dost.gov.ph/feeds/";

    let feedText: string;
    try {
      const res = await fetch(PAGASA_FEED_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ProjectAGAP/1.0)" },
      });
      if (!res.ok) {
        throw ApiError.internal(`PAGASA feed returned HTTP ${res.status}`);
      }
      feedText = await res.text();
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw ApiError.internal("Failed to fetch PAGASA feed.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xmlData = await parseStringPromise(feedText, { explicitArray: false }) as any;
    const feedData = xmlData.feed ?? xmlData.rss?.channel;
    if (!feedData) {
      throw ApiError.internal("Unrecognised PAGASA feed format.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawEntries: any[] = Array.isArray(feedData.entry)
      ? feedData.entry
      : feedData.entry
        ? [feedData.entry]
        : [];

    const entries = rawEntries.slice(0, 10);
    let ingested = 0;
    let skipped = 0;

    for (const entry of entries) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const externalId: string = String(entry.id ?? entry.guid ?? "");
      if (!externalId) {
        skipped++;
        continue;
      }

      // Dedup: skip if already ingested
      const { data: existing } = await ctx.supabaseAdmin
        .from("alerts")
        .select("id")
        .eq("external_id", externalId)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Try to fetch CAP detail
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const capLink: string = String(entry.link?.$?.href ?? entry.link ?? "");
      let title = String(entry.title ?? "PAGASA Alert");
      let body = String(entry.summary ?? entry.description ?? title);
      let severity: TableInsert<"alerts">["severity"] = "advisory";
      let hazardType = "weather";
      let signalLevel: string | null = null;
      let sourceUrl: string | null = capLink || null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const rawUpdated: string = String(entry.updated ?? entry.pubDate ?? "");
      const issuedAt = rawUpdated ? new Date(rawUpdated).toISOString() : new Date().toISOString();

      if (capLink) {
        try {
          const capRes = await fetch(capLink, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ProjectAGAP/1.0)" },
          });
          if (capRes.ok) {
            const capText = await capRes.text();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const capXml = await parseStringPromise(capText, { explicitArray: false }) as any;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const info = capXml?.alert?.info;
            if (info) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              const capTitle: string = String(info.headline ?? info.event ?? title);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              const capBody: string = String(info.description ?? info.event ?? body);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              const capEvent: string = String(info.event ?? "").toLowerCase();
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              const capSeverity: string = String(info.severity ?? "").toLowerCase();

              title = capTitle || title;
              body = capBody || body;

              if (capEvent.includes("typhoon") || capEvent.includes("bagyo")) {
                hazardType = "typhoon";
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const paramArray = Array.isArray(info.parameter) ? info.parameter : info.parameter ? [info.parameter] : [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                const signalParam = paramArray.find((p: any) => String(p.valueName ?? "").toLowerCase().includes("signal"));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                if (signalParam) signalLevel = String(signalParam.value ?? "");
              } else if (capEvent.includes("flood") || capEvent.includes("baha")) {
                hazardType = "flood";
              } else if (capEvent.includes("rain")) {
                hazardType = "rainfall";
              }

              if (capSeverity === "extreme" || capSeverity === "severe") {
                severity = "warning";
              } else if (capSeverity === "moderate") {
                severity = "watch";
              } else {
                severity = "advisory";
              }
            }
          }
        } catch {
          // Proceed with feed-level metadata on CAP fetch failure
        }
      }

      const insertPayload: TableInsert<"alerts"> = {
        barangay_id: null, // national-level alert
        source: "pagasa",
        severity,
        hazard_type: hazardType,
        title,
        body,
        signal_level: signalLevel,
        source_url: sourceUrl,
        issued_at: issuedAt,
        is_active: true,
        external_id: externalId,
      };

      const { error } = await ctx.supabaseAdmin.from("alerts").insert(insertPayload);
      if (!error) {
        ingested++;
      }
    }

    return { ingested, skipped, total: entries.length };
  }),
});
