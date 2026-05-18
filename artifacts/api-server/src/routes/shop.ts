import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, userStatsTable, shopItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { eventBus } from "@workspace/game-engine";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const BUILTIN_SHOP = [
  { id: 1, name: "Neon Agent Tag", description: "Custom nameplate with neon glow effect", type: "cosmetic", priceCoins: 500, pricePremium: 0, rarity: "rare", iconUrl: null },
  { id: 2, name: "XP Boost x2", description: "Double XP for next 10 questions", type: "boost", priceCoins: 200, pricePremium: 0, rarity: "common", iconUrl: null },
  { id: 3, name: "Analyst Title", description: "Unlock the 'Analyst' title", type: "title", priceCoins: 1000, pricePremium: 0, rarity: "rare", iconUrl: null },
  { id: 4, name: "Holographic Theme", description: "Cyber hologram UI theme", type: "theme", priceCoins: 2000, pricePremium: 0, rarity: "epic", iconUrl: null },
  { id: 5, name: "Legendary Frame", description: "Legendary avatar border", type: "cosmetic", priceCoins: 5000, pricePremium: 0, rarity: "legendary", iconUrl: null },
  { id: 6, name: "Streak Shield", description: "Protect your streak from one break", type: "boost", priceCoins: 300, pricePremium: 0, rarity: "common", iconUrl: null },
  { id: 7, name: "Master Title", description: "Unlock the 'Master' title", type: "title", priceCoins: 5000, pricePremium: 0, rarity: "epic", iconUrl: null },
  { id: 8, name: "Neon Purple Theme", description: "Purple neon UI theme variant", type: "theme", priceCoins: 1500, pricePremium: 0, rarity: "rare", iconUrl: null },
];

router.get("/shop/items", async (req, res) => {
  let owned: number[] = [];
  let coins = 0;
  const user = await getUserFromToken(req.headers.authorization);
  if (user) {
    try {
      const raw = await db.execute(sql`SELECT item_id FROM user_inventory WHERE user_id = ${user.id}`);
      owned = (raw.rows || []).map((r: any) => r.item_id);
      const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
      coins = stats?.coins ?? 0;
    } catch {}
  }

  // Prefer DB items from admin panel, fall back to built-in if empty
  let shopItems: any[];
  try {
    const dbItems = await db.select().from(shopItemsTable);
    if (dbItems.length > 0) {
      shopItems = dbItems.map(i => ({ id: i.id, name: i.name, description: i.description, type: i.type, priceCoins: i.priceCoins, pricePremium: i.pricePremium, rarity: i.rarity, iconUrl: i.iconUrl }));
    } else {
      shopItems = BUILTIN_SHOP;
    }
  } catch {
    shopItems = BUILTIN_SHOP;
  }

  res.json({ items: shopItems.map(item => ({ ...item, owned: owned.includes(item.id) })), coins });
});

router.post("/shop/buy", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { itemId } = req.body;
  const item = BUILTIN_SHOP.find(i => i.id === itemId);
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (!stats) { res.status(404).json({ error: "Stats not found" }); return; }

  try {
    const checkRaw = await db.execute(sql`SELECT id FROM user_inventory WHERE user_id = ${user.id} AND item_id = ${itemId}`);
    if (checkRaw.rows?.length) { res.status(400).json({ error: "Already owned" }); return; }
  } catch {}

  if (stats.coins < item.priceCoins) { res.status(400).json({ error: `Not enough coins. Required: ${item.priceCoins}, Available: ${stats.coins}` }); return; }

  const newCoins = stats.coins - item.priceCoins;
  await db.update(userStatsTable).set({ coins: newCoins }).where(eq(userStatsTable.userId, user.id));
  await db.execute(sql`INSERT INTO user_inventory (user_id, item_id, quantity, equipped) VALUES (${user.id}, ${itemId}, 1, false)`);

  eventBus.emitSync("XP_EARNED", {
    userId: user.id,
    data: { source: "shop_purchase", itemId, itemName: item.name, coinsSpent: item.priceCoins },
  });

  // Query shop purchase count for achievement context
  try {
    const purchaseCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM user_inventory WHERE user_id = ${user.id}`);
    const shopPurchases = parseInt((purchaseCount.rows?.[0] as any)?.cnt || "0");
    const { checkAchievements } = await import("@workspace/game-engine");
    await checkAchievements(user.id, { shopPurchases });
  } catch {}

  res.json({ success: true, item, coinsRemaining: newCoins });
});

router.get("/shop/inventory", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const raw = await db.execute(sql`SELECT ui.*, u.username FROM user_inventory ui WHERE ui.user_id = ${user.id}`);
    const items = (raw.rows || []).map((r: any) => {
      const shopItem = BUILTIN_SHOP.find(i => i.id === r.item_id);
      return { id: r.id, itemId: r.item_id, name: shopItem?.name || "Unknown", type: shopItem?.type || "cosmetic", quantity: r.quantity, equipped: r.equipped, rarity: shopItem?.rarity || "common" };
    });
    res.json(items);
  } catch { res.json([]); }
});

router.post("/shop/equip", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { itemId, equip } = req.body;
  try {
    await db.execute(sql`UPDATE user_inventory SET equipped = ${equip ? 'true' : 'false'} WHERE user_id = ${user.id} AND item_id = ${itemId}`);
    res.json({ success: true, itemId, equipped: equip });
  } catch { res.status(500).json({ error: "Server error" }); }
});

const BATTLE_PASS_LEVELS = 50;

router.get("/battle-pass", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  let bp: any = null;
  try {
    const raw = await db.execute(sql`SELECT * FROM user_battle_pass WHERE user_id = ${user.id}`);
    if (raw.rows?.length) {
      bp = raw.rows[0];
    }
  } catch {}

  res.json({
    currentLevel: bp?.current_level || 0,
    currentXp: bp?.current_xp || 0,
    isPremium: bp?.is_premium || false,
    maxLevel: BATTLE_PASS_LEVELS,
    xpPerLevel: 500,
    claimedRewards: bp?.claimed_rewards || [],
  });
});

router.post("/battle-pass/upgrade", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (!stats) { res.status(404).json({ error: "Stats not found" }); return; }

  if (stats.coins < 1500) { res.status(400).json({ error: "Premium upgrade costs 1500 coins" }); return; }

  await db.update(userStatsTable).set({ coins: stats.coins - 1500 }).where(eq(userStatsTable.userId, user.id));

  try {
    const existing = await db.execute(sql`SELECT id FROM user_battle_pass WHERE user_id = ${user.id}`);
    if (existing.rows?.length) {
      await db.execute(sql`UPDATE user_battle_pass SET is_premium = true WHERE user_id = ${user.id}`);
    } else {
      await db.execute(sql`INSERT INTO user_battle_pass (user_id, is_premium) VALUES (${user.id}, true)`);
    }
  } catch {
    await db.execute(sql`INSERT INTO user_battle_pass (user_id, is_premium) VALUES (${user.id}, true)`);
  }

  res.json({ success: true, message: "Battle Pass upgraded to premium!" });
});

export default router;
