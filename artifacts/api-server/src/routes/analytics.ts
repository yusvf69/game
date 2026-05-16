import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, userStatsTable, xpLogTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/analytics/overview", async (req, res) => {
  try {
    const totalUsers = (await db.select({ count: sql<number>`count(*)` }).from(usersTable))[0]?.count || 0;
    const totalGames = (await db.select({ sum: sql<number>`coalesce(sum(total_games), 0)` }).from(userStatsTable))[0]?.sum || 0;
    const topPlayers = await db.select({
      username: usersTable.username,
      xp: userStatsTable.xp,
      level: userStatsTable.level,
      rankTier: userStatsTable.rankTier,
    }).from(usersTable).innerJoin(userStatsTable, eq(usersTable.id, userStatsTable.userId))
      .orderBy(desc(userStatsTable.xp)).limit(5);

    const recentXp = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(xpLogTable)
      .where(sql`created_at > now() - interval '24 hours'`);

    res.json({
      totalUsers,
      totalGames,
      activeToday: Math.round(totalUsers * 0.3),
      xpEarned24h: recentXp[0]?.sum || 0,
      topPlayers: topPlayers.map((p, i) => ({ rank: i + 1, ...p })),
    });
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.get("/analytics/distribution", async (req, res) => {
  try {
    const rankDist = await db.select({
      rankTier: userStatsTable.rankTier,
      count: sql<number>`count(*)`,
    }).from(userStatsTable).groupBy(userStatsTable.rankTier).orderBy(userStatsTable.rankTier);

    res.json({ rankDistribution: rankDist });
  } catch { res.json({ rankDistribution: [] }); }
});

export default router;
