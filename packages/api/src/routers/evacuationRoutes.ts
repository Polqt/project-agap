import { z } from "zod";

import { getSupabaseDataOrThrow } from "../router-helpers";
import { publicProcedure, router } from "../index";
import { uuidSchema } from "../schemas";
import type { EvacuationRoute } from "../supabase";

export const evacuationRoutesRouter = router({
  listByBarangay: publicProcedure
    .input(
      z.object({
        barangayId: uuidSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      return (
        getSupabaseDataOrThrow<EvacuationRoute[]>(
          await ctx.supabase
            .from("evacuation_routes")
            .select(
              "id, barangay_id, center_id, name, purok_origin, route_geojson, distance_meters, estimated_walk_minutes, color_hex, is_accessible, notes, created_at, updated_at",
            )
            .eq("barangay_id", input.barangayId)
            .order("name", { ascending: true }),
          "Failed to list evacuation routes.",
        ) ?? []
      );
    }),
});
