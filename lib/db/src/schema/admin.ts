import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminLogsTable = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => usersTable.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  data: jsonb("data"),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bansTable = pgTable("bans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  reason: text("reason"),
  bannedBy: integer("banned_by").references(() => usersTable.id),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
