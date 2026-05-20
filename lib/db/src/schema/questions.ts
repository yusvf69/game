import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("text"),
  questionText: text("question_text").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  category: text("category").notNull().default("general"),
  mediaUrl: text("media_url"),
  correctAnswer: text("correct_answer").notNull(),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(30),
  points: integer("points").notNull().default(100),
  explanation: text("explanation").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;

export const questionOptionsTable = pgTable("question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionsTable.id),
  optionText: text("option_text").notNull(),
  isCorrect: integer("is_correct").notNull().default(0),
});

export type QuestionOption = typeof questionOptionsTable.$inferSelect;
