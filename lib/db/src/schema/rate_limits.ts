import { pgTable, text, timestamp, integer, serial } from "drizzle-orm/pg-core";

export const rateLimitsTable = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  bucketKey: text("bucket_key").notNull().unique(),
  count: integer("count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
