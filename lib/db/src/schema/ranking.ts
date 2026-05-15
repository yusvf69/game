import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const seasonsTable = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  theme: text("theme").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Season = typeof seasonsTable.$inferSelect;

export const rankingsTable = pgTable("rankings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  seasonId: integer("season_id").notNull().references(() => seasonsTable.id),
  mmr: integer("mmr").notNull().default(1000),
  rankTier: text("rank_tier").notNull().default("Bronze"),
  rankPoints: integer("rank_points").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Ranking = typeof rankingsTable.$inferSelect;

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rewardXp: integer("reward_xp").notNull().default(50),
  iconUrl: text("icon_url"),
  condition: text("condition").notNull().default(""),
});

export type Achievement = typeof achievementsTable.$inferSelect;

export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  achievementId: integer("achievement_id").notNull().references(() => achievementsTable.id),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserAchievement = typeof userAchievementsTable.$inferSelect;

export const friendsTable = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  friendId: integer("friend_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Friend = typeof friendsTable.$inferSelect;

export const aiPlayerProfilesTable = pgTable("ai_player_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  strengths: text("strengths").array().notNull().default([]),
  weaknesses: text("weaknesses").array().notNull().default([]),
  behaviorType: text("behavior_type").notNull().default("explorer"),
  intelligenceScore: integer("intelligence_score").notNull().default(50),
  learningCurve: text("learning_curve").notNull().default("steady"),
  recommendedDifficulty: integer("recommended_difficulty").notNull().default(3),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AiPlayerProfile = typeof aiPlayerProfilesTable.$inferSelect;
