import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: text("role").notNull().default("resident"),
  fullName: text("full_name").notNull().default(""),
  phoneNumber: text("phone_number"),
  barangayId: uuid("barangay_id"),
  purok: text("purok"),
  isSmsOnly: boolean("is_sms_only").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const barangays = pgTable("barangays", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  municipality: text("municipality").notNull(),
  province: text("province").notNull(),
  region: text("region").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  alertLevel: text("alert_level").notNull().default("normal"),
  activeAlertText: text("active_alert_text"),
  totalHouseholds: integer("total_households").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const households = pgTable("households", {
  id: uuid("id").primaryKey(),
  barangayId: uuid("barangay_id").notNull(),
  registeredBy: uuid("registered_by"),
  householdHead: text("household_head").notNull(),
  purok: varchar("purok", { length: 120 }).notNull(),
  address: text("address").notNull().default(""),
  phoneNumber: text("phone_number"),
  totalMembers: integer("total_members").notNull().default(1),
  isSmsOnly: boolean("is_sms_only").notNull().default(false),
  evacuationStatus: text("evacuation_status").notNull().default("unknown"),
  notes: text("notes"),
  welfareAssignedProfileId: uuid("welfare_assigned_profile_id"),
  welfareAssignedAt: timestamp("welfare_assigned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  profileId: uuid("profile_id").primaryKey(),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  alertNotifications: boolean("alert_notifications").notNull().default(true),
  broadcastNotifications: boolean("broadcast_notifications").notNull().default(true),
  needsReportUpdates: boolean("needs_report_updates").notNull().default(true),
  playSound: boolean("play_sound").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const mutationHistory = pgTable("mutation_history", {
  clientMutationId: text("client_mutation_id").primaryKey(),
  userId: uuid("user_id").notNull(),
  mutationType: text("mutation_type").notNull(),
  resultPayload: text("result_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
