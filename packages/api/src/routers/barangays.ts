import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";

import {
  getFoundOrThrow,
  getProfileBarangayIdOrThrow,
  getProfileOrThrow,
  getSupabaseDataOrThrow,
} from "../router-helpers";
import { officialProcedure, protectedProcedure, publicProcedure, router } from "../index";
import { uuidSchema } from "../schemas";
import type { Barangay } from "../supabase";
import type { Context } from "../context";

const barangayIdSchema = z.object({
  id: uuidSchema,
});

const residentAccessSchema = z.object({
  pingEnabled: z.boolean(),
  checkInEnabled: z.boolean(),
});

type ResidentAccessPayload = {
  barangayId: string;
  residentPingEnabled: boolean;
  residentCheckInEnabled: boolean;
  alertLevel: Barangay["alert_level"];
  activeAlertText: string | null;
};

const ACCESS_MARKER_PREFIX = "[[AGAP_ACCESS:";
const ACCESS_MARKER_SUFFIX = "]]";

export const barangaysRouter = router({
  getById: publicProcedure.input(barangayIdSchema).query(async ({ ctx, input }) => {
    const barangay = getFoundOrThrow<Barangay | null>(
      getSupabaseDataOrThrow<Barangay | null>(
        await ctx.supabase
          .from("barangays")
          .select(
            "id, name, municipality, province, region, latitude, longitude, alert_level, active_alert_text, emergency_mode_enabled, resident_ping_enabled, resident_checkin_enabled, total_households, created_at, updated_at",
          )
          .eq("id", input.id)
          .maybeSingle(),
        "Failed to load barangay.",
      ),
      "Barangay not found.",
    );

    return {
      ...barangay,
      active_alert_text: stripResidentAccessMetadata(barangay.active_alert_text),
    };
  }),

  listAll: publicProcedure.query(async ({ ctx }) => {
    const barangays = getSupabaseDataOrThrow<Barangay[]>(
      await ctx.supabase
        .from("barangays")
        .select(
          "id, name, municipality, province, region, latitude, longitude, alert_level, active_alert_text, emergency_mode_enabled, resident_ping_enabled, resident_checkin_enabled, total_households, created_at, updated_at",
        )
        .order("name", { ascending: true }),
      "Failed to list barangays.",
    ) ?? [];

    return barangays.map((barangay) => ({
      ...barangay,
      active_alert_text: stripResidentAccessMetadata(barangay.active_alert_text),
    }));
  }),

  getMyResidentAccess: protectedProcedure.query(async ({ ctx }) => {
    const profile = getProfileOrThrow(ctx.profile);
    const barangayId = getProfileBarangayIdOrThrow(profile);

    return await loadResidentAccess(ctx.supabase, barangayId);
  }),

  setResidentAccess: officialProcedure
    .input(residentAccessSchema)
    .mutation(async ({ ctx, input }) => {
      return await updateResidentAccess(ctx, input);
    }),

  getMyEmergencyMode: protectedProcedure.query(async ({ ctx }) => {
    const profile = getProfileOrThrow(ctx.profile);
    const barangayId = getProfileBarangayIdOrThrow(profile);
    const access = await loadResidentAccess(ctx.supabase, barangayId);

    return {
      barangayId: access.barangayId,
      emergencyModeEnabled: access.residentPingEnabled || access.residentCheckInEnabled,
      alertLevel: access.alertLevel,
      activeAlertText: access.activeAlertText,
    };
  }),

  setEmergencyMode: officialProcedure
    .input(
      z.object({
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await updateResidentAccess(ctx, {
        pingEnabled: input.enabled,
        checkInEnabled: input.enabled,
      });

      return {
        barangayId: access.barangayId,
        emergencyModeEnabled: access.residentPingEnabled || access.residentCheckInEnabled,
        alertLevel: access.alertLevel,
        activeAlertText: access.activeAlertText,
      };
    }),
});

async function loadResidentAccess(
  supabase: Context["supabase"],
  barangayId: string,
): Promise<ResidentAccessPayload> {
  const result = await supabase
    .from("barangays")
    .select(
      "id, resident_ping_enabled, resident_checkin_enabled, emergency_mode_enabled, alert_level, active_alert_text",
    )
    .eq("id", barangayId)
    .maybeSingle();

  if (isMissingResidentAccessColumns(result.error)) {
    const legacyResult = await supabase
      .from("barangays")
      .select("id, emergency_mode_enabled, alert_level, active_alert_text")
      .eq("id", barangayId)
      .maybeSingle();

    if (isMissingEmergencyModeColumn(legacyResult.error)) {
      const fallbackBarangay = getFoundOrThrow<Pick<Barangay, "id" | "alert_level" | "active_alert_text"> | null>(
        getSupabaseDataOrThrow<Pick<Barangay, "id" | "alert_level" | "active_alert_text"> | null>(
          await supabase
            .from("barangays")
            .select("id, alert_level, active_alert_text")
            .eq("id", barangayId)
            .maybeSingle(),
          "Failed to load resident access fallback.",
        ),
        "Barangay not found.",
      );

      const metadata = parseResidentAccessMetadata(fallbackBarangay.active_alert_text);

      return {
        barangayId: fallbackBarangay.id,
        residentPingEnabled: metadata?.residentPingEnabled ?? false,
        residentCheckInEnabled: metadata?.residentCheckInEnabled ?? false,
        alertLevel: fallbackBarangay.alert_level,
        activeAlertText: stripResidentAccessMetadata(fallbackBarangay.active_alert_text),
      };
    }

    const legacyBarangay = getFoundOrThrow<
      Pick<Barangay, "id" | "emergency_mode_enabled" | "alert_level" | "active_alert_text"> | null
    >(
      getSupabaseDataOrThrow<
        Pick<Barangay, "id" | "emergency_mode_enabled" | "alert_level" | "active_alert_text"> | null
      >(legacyResult, "Failed to load resident access legacy fallback."),
      "Barangay not found.",
    );

    const metadata = parseResidentAccessMetadata(legacyBarangay.active_alert_text);
    const fallbackEnabled = legacyBarangay.emergency_mode_enabled;

    return {
      barangayId: legacyBarangay.id,
      residentPingEnabled: metadata?.residentPingEnabled ?? fallbackEnabled,
      residentCheckInEnabled: metadata?.residentCheckInEnabled ?? fallbackEnabled,
      alertLevel: legacyBarangay.alert_level,
      activeAlertText: stripResidentAccessMetadata(legacyBarangay.active_alert_text),
    };
  }

  const barangay = getFoundOrThrow<
    Pick<
      Barangay,
      "id" | "resident_ping_enabled" | "resident_checkin_enabled" | "alert_level" | "active_alert_text"
    > | null
  >(
    getSupabaseDataOrThrow<
      Pick<
        Barangay,
        "id" | "resident_ping_enabled" | "resident_checkin_enabled" | "alert_level" | "active_alert_text"
      > | null
    >(result, "Failed to load resident access."),
    "Barangay not found.",
  );

  return {
    barangayId: barangay.id,
    residentPingEnabled: barangay.resident_ping_enabled,
    residentCheckInEnabled: barangay.resident_checkin_enabled,
    alertLevel: barangay.alert_level,
    activeAlertText: stripResidentAccessMetadata(barangay.active_alert_text),
  };
}

async function updateResidentAccess(
  ctx: Pick<Context, "supabase" | "profile">,
  input: z.infer<typeof residentAccessSchema>,
): Promise<ResidentAccessPayload> {
  const barangayId = getProfileBarangayIdOrThrow(getProfileOrThrow(ctx.profile));

  const result = await ctx.supabase
    .from("barangays")
    .update({
      resident_ping_enabled: input.pingEnabled,
      resident_checkin_enabled: input.checkInEnabled,
      emergency_mode_enabled: input.pingEnabled || input.checkInEnabled,
    })
    .eq("id", barangayId)
    .select(
      "id, resident_ping_enabled, resident_checkin_enabled, emergency_mode_enabled, alert_level, active_alert_text",
    )
    .maybeSingle();

  if (isMissingResidentAccessColumns(result.error)) {
    const currentLegacy = await loadResidentAccess(ctx.supabase, barangayId);
    const nextAlertText = injectResidentAccessMetadata(currentLegacy.activeAlertText, input);

    const legacyResult = await ctx.supabase
      .from("barangays")
      .update({
        emergency_mode_enabled: input.pingEnabled || input.checkInEnabled,
        active_alert_text: nextAlertText,
      })
      .eq("id", barangayId)
      .select("id, emergency_mode_enabled, alert_level, active_alert_text")
      .maybeSingle();

    if (isMissingEmergencyModeColumn(legacyResult.error)) {
      const noEmergencyResult = await ctx.supabase
        .from("barangays")
        .update({
          active_alert_text: nextAlertText,
        })
        .eq("id", barangayId)
        .select("id, alert_level, active_alert_text")
        .maybeSingle();

      const legacyBarangay = getFoundOrThrow<Pick<Barangay, "id" | "alert_level" | "active_alert_text"> | null>(
        getSupabaseDataOrThrow<Pick<Barangay, "id" | "alert_level" | "active_alert_text"> | null>(
          noEmergencyResult,
          "Failed to update resident access legacy fallback.",
        ),
        "Barangay not found.",
      );

      return {
        barangayId: legacyBarangay.id,
        residentPingEnabled: input.pingEnabled,
        residentCheckInEnabled: input.checkInEnabled,
        alertLevel: legacyBarangay.alert_level,
        activeAlertText: stripResidentAccessMetadata(legacyBarangay.active_alert_text),
      };
    }

    const legacyBarangay = getFoundOrThrow<
      Pick<Barangay, "id" | "emergency_mode_enabled" | "alert_level" | "active_alert_text"> | null
    >(
      getSupabaseDataOrThrow<
        Pick<Barangay, "id" | "emergency_mode_enabled" | "alert_level" | "active_alert_text"> | null
      >(legacyResult, "Failed to update resident access fallback."),
      "Barangay not found.",
    );

    return {
      barangayId: legacyBarangay.id,
      residentPingEnabled: input.pingEnabled,
      residentCheckInEnabled: input.checkInEnabled,
      alertLevel: legacyBarangay.alert_level,
      activeAlertText: stripResidentAccessMetadata(legacyBarangay.active_alert_text),
    };
  }

  const barangay = getFoundOrThrow<
    Pick<
      Barangay,
      "id" | "resident_ping_enabled" | "resident_checkin_enabled" | "alert_level" | "active_alert_text"
    > | null
  >(
    getSupabaseDataOrThrow<
      Pick<
        Barangay,
        "id" | "resident_ping_enabled" | "resident_checkin_enabled" | "alert_level" | "active_alert_text"
      > | null
    >(result, "Failed to update resident access."),
    "Barangay not found.",
  );

  return {
    barangayId: barangay.id,
    residentPingEnabled: barangay.resident_ping_enabled,
    residentCheckInEnabled: barangay.resident_checkin_enabled,
    alertLevel: barangay.alert_level,
    activeAlertText: stripResidentAccessMetadata(barangay.active_alert_text),
  };
}

function isMissingResidentAccessColumns(error: PostgrestError | null) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return error?.code === "42703" && (
    message.includes("resident_ping_enabled") || message.includes("resident_checkin_enabled")
  );
}

function isMissingEmergencyModeColumn(error: PostgrestError | null) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return error?.code === "42703" && message.includes("emergency_mode_enabled");
}

function parseResidentAccessMetadata(activeAlertText: string | null) {
  if (!activeAlertText?.startsWith(ACCESS_MARKER_PREFIX)) {
    return null;
  }

  const markerEndIndex = activeAlertText.indexOf(ACCESS_MARKER_SUFFIX);
  if (markerEndIndex === -1) {
    return null;
  }

  try {
    const raw = activeAlertText.slice(ACCESS_MARKER_PREFIX.length, markerEndIndex);
    const parsed = JSON.parse(raw) as {
      residentPingEnabled?: boolean;
      residentCheckInEnabled?: boolean;
    };

    return {
      residentPingEnabled: Boolean(parsed.residentPingEnabled),
      residentCheckInEnabled: Boolean(parsed.residentCheckInEnabled),
    };
  } catch {
    return null;
  }
}

function stripResidentAccessMetadata(activeAlertText: string | null) {
  if (!activeAlertText?.startsWith(ACCESS_MARKER_PREFIX)) {
    return activeAlertText;
  }

  const markerEndIndex = activeAlertText.indexOf(ACCESS_MARKER_SUFFIX);
  if (markerEndIndex === -1) {
    return activeAlertText;
  }

  const remainder = activeAlertText.slice(markerEndIndex + ACCESS_MARKER_SUFFIX.length).trimStart();
  return remainder.length > 0 ? remainder : null;
}

function injectResidentAccessMetadata(
  activeAlertText: string | null,
  input: z.infer<typeof residentAccessSchema>,
) {
  const visibleAlertText = stripResidentAccessMetadata(activeAlertText);
  const marker = `${ACCESS_MARKER_PREFIX}${JSON.stringify({
    residentPingEnabled: input.pingEnabled,
    residentCheckInEnabled: input.checkInEnabled,
  })}${ACCESS_MARKER_SUFFIX}`;

  return visibleAlertText ? `${marker}\n${visibleAlertText}` : marker;
}
