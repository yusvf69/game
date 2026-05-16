import { Router } from "express";
import { db } from "@workspace/db";
import { userStatsTable, sessionsTable, usersTable, xpLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const MAX_LEVEL = 100;
const XP_PER_LEVEL = 500;

const PRESTIGE_BADGES = [
  { level: 1, name: "Initiate", badge: "✦" },
  { level: 2, name: "Veteran", badge: "⚜" },
  { level: 3, name: "Elite", badge: "★" },
  { level: 4, name: "Legend", badge: "♛" },
  { level: 5, name: "Mythic", badge: "∞" },
];

router.post("/prestige/activate", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (!stats) { res.status(404).json({ error: "Stats not found" }); return; }

  if (stats.level < MAX_LEVEL) {
    res.status(400).json({ error: `Level ${MAX_LEVEL} required for prestige. Current: ${stats.level}` });
    return;
  }

  const newPrestige = stats.prestigeLevel + 1;
  const prestigeBadge = PRESTIGE_BADGES.find(p => p.level === newPrestige) || PRESTIGE_BADGES[PRESTIGE_BADGES.length - 1];
  const bonusXp = newPrestige * 1000;

  await db.update(userStatsTable).set({
    prestigeLevel: newPrestige,
    xp: bonusXp,
    level: 1,
    streak: 0,
  }).where(eq(userStatsTable.userId, user.id));

  await db.insert(xpLogTable).values({
    userId: user.id,
    action: `prestige_${newPrestige}`,
    amount: bonusXp,
  });

  res.json({
    success: true,
    prestigeLevel: newPrestige,
    badge: prestigeBadge.badge,
    title: prestigeBadge.name,
    bonusXp,
    xp: bonusXp,
    level: 1,
    message: `You have transcended to Prestige ${newPrestige} — ${prestigeBadge.name}. ${prestigeBadge.badge}`,
  });
});

router.get("/prestige/info", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (!stats) { res.status(404).json({ error: "Stats not found" }); return; }

  const canPrestige = stats.level >= MAX_LEVEL;
  const nextBadge = PRESTIGE_BADGES.find(p => p.level === stats.prestigeLevel + 1) || PRESTIGE_BADGES[PRESTIGE_BADGES.length - 1];
  const currentBadge = PRESTIGE_BADGES.find(p => p.level === stats.prestigeLevel);

  res.json({
    currentPrestige: stats.prestigeLevel,
    currentBadge: currentBadge?.badge || null,
    currentTitle: currentBadge?.name || "None",
    nextBadge: nextBadge.badge,
    nextTitle: nextBadge.name,
    canPrestige,
    maxLevel: MAX_LEVEL,
    currentLevel: stats.level,
    xpRequired: MAX_LEVEL * XP_PER_LEVEL,
    currentXp: stats.xp,
  });
});

export default router;
