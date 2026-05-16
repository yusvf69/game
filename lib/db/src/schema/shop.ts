import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { seasonsTable } from "./ranking";

export const shopItemsTable = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  priceCoins: integer("price_coins").notNull().default(0),
  pricePremium: integer("price_premium").notNull().default(0),
  rarity: text("rarity").notNull().default("common"),
  iconUrl: text("icon_url"),
  isLimited: boolean("is_limited").notNull().default(false),
  availableUntil: timestamp("available_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShopItem = typeof shopItemsTable.$inferSelect;

export const userInventoryTable = pgTable("user_inventory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  itemId: integer("item_id").notNull().references(() => shopItemsTable.id),
  quantity: integer("quantity").notNull().default(1),
  equipped: boolean("equipped").notNull().default(false),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserInventory = typeof userInventoryTable.$inferSelect;

export const battlePassTable = pgTable("battle_pass", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasonsTable.id),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  xpRequired: integer("xp_required").notNull(),
  freeReward: jsonb("free_reward"),
  premiumReward: jsonb("premium_reward"),
});

export type BattlePass = typeof battlePassTable.$inferSelect;

export const userBattlePassTable = pgTable("user_battle_pass", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  battlePassId: integer("battle_pass_id").notNull().references(() => battlePassTable.id),
  currentLevel: integer("current_level").notNull().default(0),
  currentXp: integer("current_xp").notNull().default(0),
  isPremium: boolean("is_premium").notNull().default(false),
  claimedRewards: jsonb("claimed_rewards").default([]),
});

export type UserBattlePass = typeof userBattlePassTable.$inferSelect;
