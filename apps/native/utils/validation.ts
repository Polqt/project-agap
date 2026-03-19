import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^(\+63|0)[0-9]{10}$/, "Invalid PH number")
  .optional()
  .or(z.literal(""));

export const purokSchema = z.string().min(1, "Purok is required");
export const uuidSchema = z.string().uuid();

export const signInSchema = z.object({
  email: z.string().email("Ilagay ang tamang email address."),
  password: z.string().min(8, "Ilagay ang iyong password."),
});

export const signUpSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone_number: phoneSchema,
  barangay_id: uuidSchema,
  purok: z.string().optional(),
});

export const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phoneNumber: phoneSchema,
  purok: z.string().optional(),
});

export const vulnerabilityFlagSchema = z.enum([
  "elderly",
  "pwd",
  "infant",
  "pregnant",
  "solo_parent",
  "chronic_illness",
]);

export const householdMemberSchema = z.object({
  fullName: z.string().min(1, "Enter member name"),
  age: z.string().optional(),
  vulnerabilityFlags: z.array(vulnerabilityFlagSchema).default([]),
  notes: z.string().optional(),
});

export const householdSchema = z.object({
  householdHead: z.string().min(2, "Enter household head"),
  purok: purokSchema,
  address: z.string().min(1, "Enter address"),
  phoneNumber: phoneSchema,
  totalMembers: z.number().int().min(1).max(20),
  isSmsOnly: z.boolean(),
  vulnerabilityFlags: z.array(vulnerabilityFlagSchema).default([]),
  notes: z.string().optional(),
  members: z.array(householdMemberSchema).max(19).default([]),
});
