import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, userStatsTable, sessionsTable } from "@workspace/db";
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

function calcAccuracyRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

router.get("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isGuest: user.isGuest,
    createdAt: user.createdAt,
  });
});

router.get("/users/:userId/stats", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, userId)).limit(1);
  if (!stats) {
    res.status(404).json({ error: "Stats not found" });
    return;
  }
  res.json({
    userId: stats.userId,
    xp: stats.xp,
    level: stats.level,
    coins: stats.coins,
    rankPoints: stats.rankPoints,
    streak: stats.streak,
    totalGames: stats.totalGames,
    wins: stats.wins,
    losses: stats.losses,
    prestigeLevel: stats.prestigeLevel,
    rankTier: stats.rankTier,
    accuracyRate: calcAccuracyRate(stats.wins, stats.totalGames),
  });
});

router.patch("/users/me/avatar", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { avatarUrl } = req.body;
  await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, user.id));
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl,
    isGuest: user.isGuest,
    createdAt: user.createdAt,
  });
});

export default router;
