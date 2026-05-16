import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const teamOperationsTable = pgTable("team_operations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emblem: text("emblem").notNull().default("default"),
  color: text("color").notNull().default("blue"),
  maxPlayers: integer("max_players").notNull().default(4),
  captainId: integer("captain_id").notNull().references(() => usersTable.id),
  tacticalLoadout: jsonb("tactical_loadout").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamOperation = typeof teamOperationsTable.$inferSelect;

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamOperationsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  isReady: boolean("is_ready").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamMember = typeof teamMembersTable.$inferSelect;

export const teamMatchesTable = pgTable("team_matches", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  type: text("type").notNull().default("battle"),
  status: text("status").notNull().default("lobby"),
  mode: text("mode").notNull().default("live"),
  domainOrder: jsonb("domain_order").notNull().default([]),
  domainMode: text("domain_mode").notNull().default("randomized"),
  difficulty: text("difficulty").notNull().default("agent"),
  hostId: integer("host_id").references(() => usersTable.id),
  currentDomain: text("current_domain"),
  currentQuestion: integer("current_question").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type TeamMatch = typeof teamMatchesTable.$inferSelect;

export const teamMatchScoresTable = pgTable("team_match_scores", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => teamMatchesTable.id),
  teamId: integer("team_id").notNull().references(() => teamOperationsTable.id),
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalAnswers: integer("total_answers").notNull().default(0),
  fastestAnswer: boolean("fastest_answer").notNull().default(false),
  assistsUsed: jsonb("assists_used").notNull().default([]),
  currentStreak: integer("current_streak").notNull().default(0),
  perfectCategories: jsonb("perfect_categories").notNull().default([]),
});

export type TeamMatchScore = typeof teamMatchScoresTable.$inferSelect;

export const teamMatchQuestionsTable = pgTable("team_match_questions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => teamMatchesTable.id),
  questionIndex: integer("question_index").notNull(),
  questionId: integer("question_id").notNull(),
  domain: text("domain").notNull(),
  answeredBy: integer("answered_by").references(() => teamOperationsTable.id),
  isCorrect: boolean("is_correct"),
  responseTimeMs: integer("response_time_ms"),
  buzzerTeam: integer("buzzer_team").references(() => teamOperationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamMatchQuestion = typeof teamMatchQuestionsTable.$inferSelect;
