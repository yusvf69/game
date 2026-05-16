import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const answerLogsTable = pgTable("answer_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  questionId: integer("question_id").notNull(),
  category: text("category").notNull().default("general"),
  difficulty: integer("difficulty").notNull().default(1),
  correct: integer("correct").notNull().default(0),
  timeSpentMs: integer("time_spent_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AnswerLog = typeof answerLogsTable.$inferSelect;