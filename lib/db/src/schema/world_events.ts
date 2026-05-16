import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const worldEventsTable = pgTable("world_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("upcoming"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  conditions: jsonb("conditions").default({}),
  rewards: jsonb("rewards").default({}),
  narrative: text("narrative"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorldEvent = typeof worldEventsTable.$inferSelect;

export const worldEventParticipantsTable = pgTable("world_event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => worldEventsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  contribution: integer("contribution").notNull().default(0),
  rewardsClaimed: boolean("rewards_claimed").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorldEventParticipant = typeof worldEventParticipantsTable.$inferSelect;

export const worldStateTable = pgTable("world_state", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WorldState = typeof worldStateTable.$inferSelect;
