import { z } from "zod";
import type { VulnerabilityFlag } from "@project-agap/api/supabase/types";

export const vulnerabilityFlagOptions = [
  "elderly",
  "pwd",
  "infant",
  "pregnant",
  "solo_parent",
  "chronic_illness",
] as const satisfies readonly VulnerabilityFlag[];

const vulnerabilityFlagSchema = z.enum(vulnerabilityFlagOptions);

const householdMemberSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the member's name."),
  age: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) {
        return true;
      }
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 0 && parsed <= 130;
    }, "Age must be between 0 and 130."),
  vulnerabilityFlags: z.array(vulnerabilityFlagSchema).max(6),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const residentSignUpSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
    fullName: z.string().trim().min(2, "Enter your full name."),
    phoneNumber: z.string().trim().max(40).optional().or(z.literal("")),
    barangayId: z.string().uuid("Pick a barangay."),
    purok: z.string().trim().min(1, "Enter your purok."),
    address: z.string().trim().max(240).optional().or(z.literal("")),
    totalMembers: z.number().int().min(1).max(30),
    vulnerabilityFlags: z.array(z.enum(vulnerabilityFlagOptions)).max(6),
    isSmsOnly: z.boolean(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phoneNumber: z.string().trim().max(40).optional().or(z.literal("")),
  purok: z.string().trim().min(1, "Enter your purok."),
});

export const householdSchema = z
  .object({
    householdHead: z.string().trim().min(2, "Enter the household head."),
    address: z.string().trim().min(3, "Enter the household address."),
    purok: z.string().trim().min(1, "Enter the purok."),
    phoneNumber: z.string().trim().max(40).optional().or(z.literal("")),
    totalMembers: z
      .string()
      .min(1, "Enter the total household members.")
      .refine((value) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20;
      }, "Total members must be between 1 and 20."),
    isSmsOnly: z.boolean(),
    vulnerabilityFlags: z.array(vulnerabilityFlagSchema).max(6),
    members: z.array(householdMemberSchema).max(19),
    notes: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const totalMembers = Number(value.totalMembers);
    if (Number.isNaN(totalMembers)) {
      return;
    }

    const minimumMembers = value.members.length + 1;
    if (totalMembers < minimumMembers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total members must be at least ${minimumMembers}.`,
        path: ["totalMembers"],
      });
    }
  });

export const broadcastSchema = z.object({
  broadcastType: z.enum(["evacuate_now", "stay_alert", "all_clear", "custom"]),
  message: z.string().trim().min(4, "Enter a message."),
  messageFilipino: z.string().trim().max(2000).optional().or(z.literal("")),
  targetPurok: z.string().trim().max(120).optional().or(z.literal("")),
});

export const needsReportSchema = z.object({
  centerId: z.string().uuid().optional().or(z.literal("")),
  totalEvacuees: z.string().refine((value) => Number(value) >= 0, "Enter a valid evacuee count."),
  needsFoodPacks: z.string().refine((value) => Number(value) >= 0, "Enter a valid number."),
  needsWaterLiters: z.string().refine((value) => Number(value) >= 0, "Enter a valid number."),
  needsBlankets: z.string().refine((value) => Number(value) >= 0, "Enter a valid number."),
  needsMedicine: z.boolean(),
  medicalCases: z.string().trim().max(1000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
export type ResidentSignUpFormValues = z.infer<typeof residentSignUpSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type HouseholdFormValues = z.infer<typeof householdSchema>;
export type HouseholdMemberFormValues = z.infer<typeof householdMemberSchema>;
export type BroadcastFormValues = z.infer<typeof broadcastSchema>;
export type NeedsReportFormValues = z.infer<typeof needsReportSchema>;
