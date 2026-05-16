import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userAnsweredQuestionsTable = pgTable("user_answered_questions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  questionId: integer("question_id").notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  correct: boolean("correct").notNull().default(false),
});

export type UserAnsweredQuestion = typeof userAnsweredQuestionsTable.$inferSelect;

export const missionLogsTable = pgTable("mission_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  domains: text("domains").array().notNull().default([]),
  difficulty: text("difficulty").notNull().default("agent"),
  modifiers: jsonb("modifiers").notNull().default([]),
  threatLevel: text("threat_level").notNull().default("moderate"),
  estimatedXp: integer("estimated_xp").notNull().default(0),
  totalXpGained: integer("total_xp_gained").notNull().default(0),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  questionsCorrect: integer("questions_correct").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MissionLog = typeof missionLogsTable.$inferSelect;