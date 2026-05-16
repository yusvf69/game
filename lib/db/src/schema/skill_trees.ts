import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const skillTreesTable = pgTable("skill_trees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  branch: text("branch").notNull(),
  level: integer("level").notNull(),
  maxLevel: integer("max_level").notNull(),
  iconUrl: text("icon_url").notNull(),
  parentSkillId: integer("parent_skill_id"),
  xpCost: integer("xp_cost").notNull(),
  statBonus: jsonb("stat_bonus").default({}),
});

export type SkillTree = typeof skillTreesTable.$inferSelect;

export const playerSkillsTable = pgTable("player_skills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  skillId: integer("skill_id").notNull().references(() => skillTreesTable.id),
  currentLevel: integer("current_level").notNull().default(0),
  unlocked: boolean("unlocked").notNull().default(false),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
});

export type PlayerSkill = typeof playerSkillsTable.$inferSelect;
