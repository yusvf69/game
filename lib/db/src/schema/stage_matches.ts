import { pgTable, serial, integer, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";

export const stageMatchesTable = pgTable("stage_matches", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().unique(),
  hostId: integer("host_id").notNull(),
  roomCode: varchar("room_code", { length: 10 }).notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
