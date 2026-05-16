import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const tacticalModulesTable = pgTable("tactical_modules", {
  id: serial("id").primaryKey(),
  moduleId: text("module_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  energyCost: integer("energy_cost").notNull().default(1),
  category: text("category").notNull().default("assist"),
  rarity: text("rarity").notNull().default("common"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TacticalModule = typeof tacticalModulesTable.$inferSelect;

export const userTacticalModulesTable = pgTable("user_tactical_modules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  tacticalEnergy: integer("tactical_energy").notNull().default(10),
  maxEnergy: integer("max_energy").notNull().default(10),
  modules: jsonb("modules").notNull().default({}),
  lastEnergyRegen: timestamp("last_energy_regen", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserTacticalModules = typeof userTacticalModulesTable.$inferSelect;
