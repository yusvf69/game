import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiCharactersTable = pgTable("ai_characters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  personality: text("personality").notNull(),
  backstory: text("backstory").notNull(),
  avatarUrl: text("avatar_url"),
  voiceStyle: text("voice_style").notNull().default("neutral"),
  greeting: text("greeting").notNull(),
  mood: text("mood").notNull().default("neutral"),
  isActive: boolean("is_active").notNull().default(true),
});

export type AiCharacter = typeof aiCharactersTable.$inferSelect;

export const characterMemoryTable = pgTable("character_memory", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull().references(() => aiCharactersTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  memoryKey: text("memory_key").notNull(),
  memoryValue: jsonb("memory_value").notNull(),
  importance: integer("importance").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CharacterMemory = typeof characterMemoryTable.$inferSelect;
