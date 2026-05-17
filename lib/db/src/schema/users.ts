import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("player"),
  isGuest: boolean("is_guest").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLogin: timestamp("last_login", { withTimezone: true }),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, lastLogin: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const userStatsTable = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  coins: integer("coins").notNull().default(100),
  rankPoints: integer("rank_points").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  totalGames: integer("total_games").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  prestigeLevel: integer("prestige_level").notNull().default(0),
  rankTier: text("rank_tier").notNull().default("Bronze"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserStatsSchema = createInsertSchema(userStatsTable).omit({ id: true, updatedAt: true });
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStatsTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
