import { Router } from "express";
import { db } from "@workspace/db";
import {
  userStatsTable,
  usersTable,
  rankingsTable,
  seasonsTable,
  sessionsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

router.get("/rankings/global", async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

  const topStats = await db.select().from(userStatsTable)
    .orderBy(desc(userStatsTable.xp))
    .limit(limit);

  const result = await Promise.all(topStats.map(async (stats, idx) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stats.userId)).limit(1);
    return {
      rank: idx + 1,
      userId: stats.userId,
      username: user?.username || "Unknown",
      avatarUrl: user?.avatarUrl || null,
      xp: stats.xp,
      level: stats.level,
      rankTier: stats.rankTier,
      score: stats.xp + stats.rankPoints * 2,
    };
  }));

  res.json(result);
});

router.get("/rankings/daily", async (req, res) => {
  const topStats = await db.select().from(userStatsTable)
    .orderBy(desc(userStatsTable.rankPoints))
    .limit(20);

  const result = await Promise.all(topStats.map(async (stats, idx) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stats.userId)).limit(1);
    return {
      rank: idx + 1,
      userId: stats.userId,
      username: user?.username || "Unknown",
      avatarUrl: user?.avatarUrl || null,
      xp: stats.xp,
      level: stats.level,
      rankTier: stats.rankTier,
      score: stats.rankPoints,
    };
  }));

  res.json(result);
});

router.get("/rankings/seasonal", async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  try {
    const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.isActive, true)).limit(1);
    if (!season) { res.json([]); return; }

    const ranks = await db.select().from(rankingsTable)
      .where(eq(rankingsTable.seasonId, season.id))
      .orderBy(desc(rankingsTable.rankPoints))
      .limit(limit);

    const result = await Promise.all(ranks.map(async (rank, idx) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, rank.userId)).limit(1);
      return {
        rank: idx + 1,
        userId: rank.userId,
        username: user?.username || "Unknown",
        avatarUrl: user?.avatarUrl || null,
        xp: rank.rankPoints,
        level: 0,
        rankTier: rank.rankTier,
        score: rank.mmr,
      };
    }));

    res.json({ season: { id: season.id, name: season.name, theme: season.theme, endDate: season.endDate }, entries: result });
  } catch {
    res.json({ season: null, entries: [] });
  }
});

router.get("/rankings/me", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.isActive, true)).limit(1);
  let ranking = null;
  if (season) {
    const ranks = await db.select().from(rankingsTable).where(eq(rankingsTable.seasonId, season.id));
    ranking = ranks.find((r) => r.userId === user.id);
  }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  const allStats = await db.select().from(userStatsTable).orderBy(desc(userStatsTable.xp));
  const position = allStats.findIndex((s) => s.userId === user.id) + 1;

  res.json({
    userId: user.id,
    mmr: ranking?.mmr || 1000,
    rankTier: stats?.rankTier || "Bronze",
    rankPoints: stats?.rankPoints || 0,
    seasonId: season?.id || 1,
    position,
  });
});

router.get("/seasons/current", async (req, res) => {
  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.isActive, true)).limit(1);
  if (!season) {
    res.json({
      id: 1,
      name: "Season 1: The Awakening",
      theme: "The Archive Rises",
      startDate: "2040-01-01",
      endDate: "2040-03-31",
      isActive: true,
    });
    return;
  }
  res.json({
    id: season.id,
    name: season.name,
    theme: season.theme,
    startDate: season.startDate,
    endDate: season.endDate,
    isActive: season.isActive,
  });
});

export default router;
