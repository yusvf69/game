import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  unlockLevel: integer("unlock_level").notNull().default(1),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Chapter = typeof chaptersTable.$inferSelect;

export const storyNodesTable = pgTable("story_nodes", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id),
  type: text("type").notNull().default("dialogue"),
  content: text("content").notNull(),
  speakerName: text("speaker_name"),
  mediaUrl: text("media_url"),
  orderIndex: integer("order_index").notNull().default(0),
});

export type StoryNode = typeof storyNodesTable.$inferSelect;

export const storyChoicesTable = pgTable("story_choices", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull().references(() => storyNodesTable.id),
  text: text("text").notNull(),
  nextNodeId: integer("next_node_id"),
  consequenceFlag: text("consequence_flag"),
});

export type StoryChoice = typeof storyChoicesTable.$inferSelect;

export const playerProgressTable = pgTable("player_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  currentChapterId: integer("current_chapter_id").notNull().default(1),
  currentNodeId: integer("current_node_id").notNull().default(1),
  reputationScore: integer("reputation_score").notNull().default(0),
  storyFlags: jsonb("story_flags").default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PlayerProgress = typeof playerProgressTable.$inferSelect;

export const loreEntriesTable = pgTable("lore_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("world"),
  isSecret: boolean("is_secret").notNull().default(false),
  unlockCondition: text("unlock_condition"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoreEntry = typeof loreEntriesTable.$inferSelect;

export const userLoreUnlocksTable = pgTable("user_lore_unlocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  loreId: integer("lore_id").notNull().references(() => loreEntriesTable.id),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
});
