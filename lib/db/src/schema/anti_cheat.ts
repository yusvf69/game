import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const antiCheatLogsTable = pgTable("anti_cheat_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  action: text("action").notNull(),
  details: jsonb("details").default({}),
  severity: integer("severity").notNull().default(0),
  flagged: boolean("flagged").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AntiCheatLog = typeof antiCheatLogsTable.$inferSelect;

export const rateLimitTable = pgTable("rate_limit", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  ip: text("ip"),
  endpoint: text("endpoint").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export type RateLimit = typeof rateLimitTable.$inferSelect;
