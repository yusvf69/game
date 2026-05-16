import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("registration"),
  maxParticipants: integer("max_participants").notNull(),
  minLevel: integer("min_level").notNull().default(1),
  entryFee: integer("entry_fee").notNull().default(0),
  rewardXp: integer("reward_xp").notNull(),
  rewardCoins: integer("reward_coins").notNull(),
  rewardItem: text("reward_item"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tournament = typeof tournamentsTable.$inferSelect;

export const tournamentParticipantsTable = pgTable("tournament_participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournamentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  seed: integer("seed").notNull().default(0),
  currentRound: integer("current_round").notNull().default(0),
  isEliminated: boolean("is_eliminated").notNull().default(false),
  finalPosition: integer("final_position"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TournamentParticipant = typeof tournamentParticipantsTable.$inferSelect;

export const tournamentMatchesTable = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournamentsTable.id),
  round: integer("round").notNull(),
  matchIndex: integer("match_index").notNull(),
  player1Id: integer("player1_id").references(() => usersTable.id),
  player2Id: integer("player2_id").references(() => usersTable.id),
  winnerId: integer("winner_id").references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type TournamentMatch = typeof tournamentMatchesTable.$inferSelect;
