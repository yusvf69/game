import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("pvp"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type Match = typeof matchesTable.$inferSelect;

export const matchPlayersTable = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  score: integer("score").notNull().default(0),
  rankChange: integer("rank_change").notNull().default(0),
  isWinner: integer("is_winner").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  timeMs: integer("time_ms").notNull().default(0),
});

export type MatchPlayer = typeof matchPlayersTable.$inferSelect;

export const matchEventsTable = pgTable("match_events", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id),
  type: text("type").notNull(),
  payload: jsonb("payload").default({}),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const xpLogTable = pgTable("xp_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  action: text("action").notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type XpLog = typeof xpLogTable.$inferSelect;
