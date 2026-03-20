import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const barangayIdSchema = z.object({
  barangayId: uuidSchema.optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const vulnerabilityFlagSchema = z.enum([
  "elderly",
  "pwd",
  "infant",
  "pregnant",
  "solo_parent",
  "chronic_illness",
]);
