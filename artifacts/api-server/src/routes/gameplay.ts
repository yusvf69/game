import { Router } from "express";
import { db } from "@workspace/db";
import {
  questionsTable,
  questionOptionsTable,
  userStatsTable,
  sessionsTable,
  usersTable,
  matchesTable,
  matchPlayersTable,
  xpLogTable,
  achievementsTable,
  userAchievementsTable,
  answerLogsTable,
  aiPlayerProfilesTable,
} from "@workspace/db";
import { eq, ne, and, desc, sql, inArray } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const XP_PER_LEVEL = 500;

function calcLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function getRankTier(rankPoints: number): string {
  if (rankPoints >= 4000) return "Legend";
  if (rankPoints >= 3000) return "Master";
  if (rankPoints >= 2000) return "Diamond";
  if (rankPoints >= 1500) return "Platinum";
  if (rankPoints >= 1000) return "Gold";
  if (rankPoints >= 500) return "Silver";
  return "Bronze";
}

router.get("/questions", async (req, res) => {
  const rawCategories = req.query.categories as string | undefined;
  const category = req.query.category as string | undefined;
  const minDiff = req.query.minDiff ? parseInt(req.query.minDiff as string) : undefined;
  const maxDiff = req.query.maxDiff ? parseInt(req.query.maxDiff as string) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const user = await getUserFromToken(req.headers.authorization);

  // Check AI profile for dynamic difficulty adjustment
  let timeScale = 1.0;
  if (user) {
    const [profile] = await db.select().from(aiPlayerProfilesTable).where(eq(aiPlayerProfilesTable.userId, user.id)).limit(1);
    if (profile && profile.recommendedDifficulty) {
      if (!minDiff) {
        // Allow ±1 difficulty from preferred for variety
      }
      if (profile.behaviorType === "strategic") {
        timeScale = 0.7;
      } else if (profile.behaviorType === "explorer") {
        timeScale = 1.0;
      } else if (profile.behaviorType === "learner") {
        timeScale = 1.4;
      }
    }
  }

  const conditions = [];

  // Handle categories (comma-separated list)
  const categoriesList = rawCategories ? rawCategories.split(",").map((c) => c.trim()).filter(Boolean) : [];
  if (category) categoriesList.push(category);
  if (categoriesList.length > 0) {
    conditions.push(inArray(questionsTable.category, categoriesList));
  }

  // Handle difficulty range
  if (minDiff !== undefined && maxDiff !== undefined) {
    conditions.push(sql`${questionsTable.difficulty} BETWEEN ${minDiff} AND ${maxDiff}`);
  } else if (minDiff !== undefined) {
    conditions.push(sql`${questionsTable.difficulty} >= ${minDiff}`);
  } else if (maxDiff !== undefined) {
    conditions.push(sql`${questionsTable.difficulty} <= ${maxDiff}`);
  }

  const questions = await db.select().from(questionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  const result = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText })
      .from(questionOptionsTable)
      .where(eq(questionOptionsTable.questionId, q.id));
    let adjustedTime = q.timeLimitSeconds;
    if (q.timeLimitSeconds) {
      adjustedTime = Math.max(5, Math.round(q.timeLimitSeconds * timeScale));
    }
    return {
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      difficulty: q.difficulty,
      category: q.category,
      mediaUrl: q.mediaUrl,
      options,
      timeLimit: adjustedTime,
      directorAdjusted: timeScale !== 1.0,
    };
  }));

  res.json(result);
});

router.post("/questions/:questionId/answer", async (req, res) => {
  const questionId = parseInt(req.params.questionId);
  const user = await getUserFromToken(req.headers.authorization);

  const [question] = await db.select().from(questionsTable).where(eq(questionsTable.id, questionId)).limit(1);
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const { optionId, timeSpentMs } = req.body;
  const [selectedOption] = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.id, optionId)).limit(1);
  const isCorrect = selectedOption?.isCorrect === 1;

  const [correctOption] = await db.select().from(questionOptionsTable)
    .where(and(eq(questionOptionsTable.questionId, questionId), eq(questionOptionsTable.isCorrect, 1)))
    .limit(1);

  let xpGained = 0;
  let streakBonus = 0;
  let newLevel = null;

  if (isCorrect && user) {
    const speedBonus = timeSpentMs < 5000 ? 20 : timeSpentMs < 10000 ? 10 : 0;
    xpGained = 10 * question.difficulty + speedBonus;

    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
    if (stats) {
      const newStreak = stats.streak + 1;
      streakBonus = newStreak >= 5 ? 15 : newStreak >= 3 ? 5 : 0;
      xpGained += streakBonus;
      const newXp = stats.xp + xpGained;
      const newLevelCalc = calcLevel(newXp);
      const leveledUp = newLevelCalc > stats.level;
      newLevel = leveledUp ? newLevelCalc : null;

      await db.update(userStatsTable).set({
        xp: newXp,
        level: newLevelCalc,
        streak: newStreak,
        rankTier: getRankTier(stats.rankPoints),
      }).where(eq(userStatsTable.userId, user.id));

      await db.insert(xpLogTable).values({ userId: user.id, action: "correct_answer", amount: xpGained });
    }
  } else if (!isCorrect && user) {
    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
    if (stats) {
      await db.update(userStatsTable).set({ streak: 0 }).where(eq(userStatsTable.userId, user.id));
    }
  }

  await db.insert(answerLogsTable).values({
    userId: user?.id || 0,
    questionId,
    category: question.category,
    difficulty: question.difficulty,
    correct: isCorrect ? 1 : 0,
    timeSpentMs,
  });

  res.json({
    correct: isCorrect,
    xpGained,
    correctOptionId: correctOption?.id || 0,
    explanation: question.explanation,
    streakBonus,
    newLevel,
  });
});

router.get("/gameplay/daily-challenge", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  const questions = await db.select().from(questionsTable).orderBy(sql`RANDOM()`).limit(5);

  const result = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText })
      .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return { id: q.id, type: q.type, questionText: q.questionText, difficulty: q.difficulty, category: q.category, mediaUrl: q.mediaUrl, options, timeLimit: q.timeLimitSeconds };
  }));

  res.json({
    date: new Date().toISOString().split("T")[0],
    questions: result,
    bonusXp: 150,
    completed: false,
  });
});

router.get("/gameplay/summary", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  const recentLogs = await db.select().from(xpLogTable)
    .where(eq(xpLogTable.userId, user.id))
    .orderBy(desc(xpLogTable.createdAt))
    .limit(5);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const recentActivity = recentLogs.map((log) => ({
    type: log.action,
    description: `${log.action.replace(/_/g, " ")}`,
    xpGained: log.amount,
    timestamp: log.createdAt,
  }));

  res.json({
    userId: user.id,
    totalXp: stats?.xp || 0,
    currentLevel: stats?.level || 1,
    rankTier: stats?.rankTier || "Bronze",
    streak: stats?.streak || 0,
    weeklyXp: recentLogs.reduce((sum, l) => sum + l.amount, 0),
    todayGames: stats?.totalGames || 0,
    recentActivity,
  });
});

router.get("/matches", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const playerMatches = await db.select().from(matchPlayersTable)
    .where(eq(matchPlayersTable.userId, user.id))
    .orderBy(desc(matchPlayersTable.id))
    .limit(10);

  const result = await Promise.all(playerMatches.map(async (mp) => {
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, mp.matchId)).limit(1);
    const players = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, mp.matchId));
    const playerDetails = await Promise.all(players.map(async (p) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId)).limit(1);
      return { userId: p.userId, username: u?.username || "Unknown", score: p.score, rankChange: p.rankChange, isWinner: p.isWinner === 1 };
    }));
    return { id: match?.id || 0, type: match?.type || "pvp", status: match?.status || "finished", players: playerDetails, createdAt: match?.createdAt || new Date() };
  }));

  res.json(result);
});

router.post("/matches", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { type } = req.body;
  const [match] = await db.insert(matchesTable).values({ type: type || "pvp", status: "active" }).returning();
  await db.insert(matchPlayersTable).values({ matchId: match.id, userId: user.id, score: 0 });

  res.status(201).json({ id: match.id, type: match.type, status: match.status, players: [], createdAt: match.createdAt });
});

router.get("/matches/:matchId", async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId)).limit(1);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }

  const players = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
  const playerDetails = await Promise.all(players.map(async (p) => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId)).limit(1);
    return { userId: p.userId, username: u?.username || "Unknown", score: p.score, rankChange: p.rankChange, isWinner: p.isWinner === 1 };
  }));

  res.json({ id: match.id, type: match.type, status: match.status, players: playerDetails, createdAt: match.createdAt });
});

router.post("/matches/:matchId/complete", async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { score, correctAnswers, totalQuestions, timeMs } = req.body;
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  const isWinner = accuracy >= 0.6;
  const xpGained = Math.round(score * 0.1 + (isWinner ? 50 : 10));
  const rankChange = isWinner ? 25 : -10;

  await db.update(matchPlayersTable).set({
    score, isWinner: isWinner ? 1 : 0, rankChange, correctAnswers, totalQuestions, timeMs
  }).where(and(eq(matchPlayersTable.matchId, matchId), eq(matchPlayersTable.userId, user.id)));

  await db.update(matchesTable).set({ status: "finished", finishedAt: new Date() }).where(eq(matchesTable.id, matchId));

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (stats) {
    const newXp = stats.xp + xpGained;
    const newRankPoints = Math.max(0, stats.rankPoints + rankChange);
    await db.update(userStatsTable).set({
      xp: newXp,
      level: calcLevel(newXp),
      rankPoints: newRankPoints,
      rankTier: getRankTier(newRankPoints),
      totalGames: stats.totalGames + 1,
      wins: isWinner ? stats.wins + 1 : stats.wins,
      losses: !isWinner ? stats.losses + 1 : stats.losses,
    }).where(eq(userStatsTable.userId, user.id));

    await db.insert(xpLogTable).values({ userId: user.id, action: `match_${isWinner ? "win" : "loss"}`, amount: xpGained });
  }

  const newRankTier = getRankTier(Math.max(0, (stats?.rankPoints || 0) + rankChange));

  res.json({ matchId, isWinner, xpGained, rankChange, newRankTier });
});

router.post("/xp/award", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { action, amount, multiplier = 1 } = req.body;
  const xpGained = Math.round(amount * multiplier);

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (!stats) { res.status(404).json({ error: "Stats not found" }); return; }

  const newXp = stats.xp + xpGained;
  const newLevel = calcLevel(newXp);
  const leveledUp = newLevel > stats.level;

  await db.update(userStatsTable).set({ xp: newXp, level: newLevel }).where(eq(userStatsTable.userId, user.id));
  await db.insert(xpLogTable).values({ userId: user.id, action, amount: xpGained });

  res.json({ xpGained, totalXp: newXp, newLevel, leveledUp, unlocks: leveledUp ? [`Level ${newLevel} unlocked`] : [] });
});

router.get("/achievements", async (req, res) => {
  const achievements = await db.select().from(achievementsTable);
  res.json(achievements.map((a) => ({
    id: a.id, name: a.name, description: a.description, rewardXp: a.rewardXp, iconUrl: a.iconUrl
  })));
});

router.get("/achievements/user", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const userAch = await db.select().from(userAchievementsTable)
    .where(eq(userAchievementsTable.userId, user.id));

  const result = await Promise.all(userAch.map(async (ua) => {
    const [ach] = await db.select().from(achievementsTable).where(eq(achievementsTable.id, ua.achievementId)).limit(1);
    return {
      achievement: { id: ach?.id || 0, name: ach?.name || "", description: ach?.description || "", rewardXp: ach?.rewardXp || 0, iconUrl: ach?.iconUrl || null },
      unlockedAt: ua.unlockedAt,
    };
  }));

  res.json(result);
});

export default router;
