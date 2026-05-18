import { Router } from "express";
import { db } from "@workspace/db";
import {
  questionsTable,
  questionOptionsTable,
  sessionsTable,
  usersTable,
  userStatsTable,
  xpLogTable,
  userAnsweredQuestionsTable,
  missionLogsTable,
  answerLogsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and, notInArray, desc, sql } from "drizzle-orm";

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
function calcLevel(xp: number): number { return Math.floor(xp / XP_PER_LEVEL) + 1; }
function getRankTier(rp: number): string {
  if (rp >= 4000) return "Legend"; if (rp >= 3000) return "Master";
  if (rp >= 2000) return "Diamond"; if (rp >= 1500) return "Platinum";
  if (rp >= 1000) return "Gold"; if (rp >= 500) return "Silver";
  return "Bronze";
}

// Domain lookup: in-game name -> DB category (loaded from DB categories table)
let domainCategoriesCache: Record<string, string[]> | null = null;
let domainCategoriesCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

async function loadDomainCategories(): Promise<Record<string, string[]>> {
  const now = Date.now();
  if (domainCategoriesCache && now - domainCategoriesCacheTime < CACHE_TTL) {
    return domainCategoriesCache;
  }
  const all = await db.select().from(categoriesTable);
  const map: Record<string, string[]> = {};
  for (const cat of all) {
    const domain = cat.domain || "general";
    if (!map[domain]) map[domain] = [];
    if (!map[domain].includes(cat.name)) map[domain].push(cat.name);
  }
  domainCategoriesCache = map;
  domainCategoriesCacheTime = now;
  return map;
}

const DIFFICULTY_CONFIG: Record<string, { timerMult: number; xpMult: number; label: string; diffRange: number[] }> = {
  recruit: { timerMult: 1.5, xpMult: 0.5, label: "RECRUIT", diffRange: [1, 3] },
  agent: { timerMult: 1.0, xpMult: 1.0, label: "AGENT", diffRange: [3, 6] },
  elite: { timerMult: 0.7, xpMult: 1.8, label: "ELITE", diffRange: [5, 8] },
  omega: { timerMult: 0.4, xpMult: 3.0, label: "OMEGA", diffRange: [7, 10] },
};

const THREAT_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "LOW", color: "green" },
  moderate: { label: "MODERATE", color: "yellow" },
  high: { label: "HIGH", color: "orange" },
  severe: { label: "SEVERE", color: "red" },
  critical: { label: "CRITICAL", color: "purple" },
};

function calculateThreatLevel(domainCount: number, difficulty: string, modifiers: string[]): string {
  let score = domainCount * 5;
  const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.agent;
  score += diffCfg.xpMult * 20;
  if (modifiers.includes("timed")) score += 15;
  if (modifiers.includes("adaptive")) score += 10;
  if (modifiers.includes("bonus_xp")) score += 10;

  if (score >= 80) return "critical";
  if (score >= 60) return "severe";
  if (score >= 40) return "high";
  if (score >= 20) return "moderate";
  return "low";
}

function estimateXp(domainCount: number, difficulty: string, modifiers: string[]): number {
  const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.agent;
  let base = domainCount * 40;
  base = Math.round(base * diffCfg.xpMult);
  if (modifiers.includes("bonus_xp")) base = Math.round(base * 1.3);
  if (modifiers.includes("timed")) base += 30;
  if (modifiers.includes("adaptive")) base += 20;
  return base;
}

// GET /mission/domains — returns all domains with player mastery info
router.get("/mission/domains", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);

  const domainCategories = await loadDomainCategories();

  const displayNames: Record<string, string> = {
    cyber_systems: "Cyber Systems",
    cognitive_analysis: "Cognitive Analysis",
    historical_archives: "Historical Archives",
    threat_intelligence: "Threat Intelligence",
    scientific_division: "Scientific Division",
    behavioral_analysis: "Behavioral Analysis",
    global_mapping: "Global Mapping",
    quantitative_operations: "Quantitative Operations",
    ethical_protocols: "Ethical Protocols",
    linguistic_decoding: "Linguistic Decoding",
    orbital_intelligence: "Orbital Intelligence",
    geopolitical_affairs: "Geopolitical Affairs",
    cultural_archives: "Cultural Archives",
    ancient_records: "Ancient Records",
    cipher_division: "Cipher Division",
  };
  const descriptions: Record<string, string> = {
    cyber_systems: "Network penetration and digital forensics",
    cognitive_analysis: "Pattern recognition and abstract reasoning",
    historical_archives: "Past events and their strategic implications",
    threat_intelligence: "Security protocols and threat assessment",
    scientific_division: "Technical and scientific knowledge",
    behavioral_analysis: "Human psychology and motive prediction",
    global_mapping: "Geographic and spatial intelligence",
    quantitative_operations: "Mathematical modeling and calculation",
    ethical_protocols: "Philosophical judgement and ethics",
    linguistic_decoding: "Language analysis and translation",
    orbital_intelligence: "Satellite and space-based reconnaissance",
    geopolitical_affairs: "Political structures and international relations",
    cultural_archives: "Art, media, and cultural artifacts",
    ancient_records: "Mythology and ancient civilizations",
    cipher_division: "Encryption, codes, and cryptographic analysis",
  };

  const domains = Object.entries(domainCategories).map(([key, cats]) => {
    return { id: key, name: displayNames[key] || key, description: descriptions[key] || "", categories: cats };
  });

  // If user is authed, compute per-domain mastery from answer logs
  let domainMastery: Record<string, number> = {};
  if (user) {
    const logs = await db.select().from(answerLogsTable).where(eq(answerLogsTable.userId, user.id));
    for (const domain of domains) {
      const domainLogs = logs.filter((l) => domain.categories.includes(l.category));
      if (domainLogs.length > 0) {
        const correct = domainLogs.filter((l) => l.correct === 1).length;
        domainMastery[domain.id] = Math.round((correct / domainLogs.length) * 100);
      } else {
        domainMastery[domain.id] = -1; // no data
      }
    }
  }

  res.json({ domains, mastery: domainMastery });
});

// POST /mission/start — generates a mission with questions, excluding answered ones
router.post("/mission/start", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { domains, difficulty = "agent", modifiers = [], questionCount = 10 } = req.body;

  // Validate
  if (!domains || !Array.isArray(domains) || domains.length === 0 || domains.length > 6) {
    res.status(400).json({ error: "Select 1–6 intelligence domains" });
    return;
  }

  const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.agent;

  // Resolve DB categories from domain IDs
  const domainCategories = await loadDomainCategories();
  const selectedCategories: string[] = [];
  for (const d of domains) {
    const cats = domainCategories[d];
    if (cats) selectedCategories.push(...cats);
  }

  if (selectedCategories.length === 0) {
    res.status(400).json({ error: "Invalid domains" });
    return;
  }

  // Get already answered question IDs
  const answered = await db.select({ questionId: userAnsweredQuestionsTable.questionId })
    .from(userAnsweredQuestionsTable)
    .where(eq(userAnsweredQuestionsTable.userId, user.id));

  const answeredIds = answered.map((a) => a.questionId);

  // Build question query
  const conditions = [];
  if (selectedCategories.length > 0) {
    conditions.push(sql`${questionsTable.category} IN (${sql.join(selectedCategories.map((c) => sql`${c}`), sql`, `)})`);
  }
  conditions.push(sql`${questionsTable.difficulty} >= ${diffCfg.diffRange[0]} AND ${questionsTable.difficulty} <= ${diffCfg.diffRange[1]}`);

  if (answeredIds.length > 0) {
    conditions.push(sql`${questionsTable.id} NOT IN (${sql.join(answeredIds.map((id) => sql`${id}`), sql`, `)})`);
  }

  let questions = await db.select().from(questionsTable)
    .where(and(...conditions))
    .orderBy(sql`RANDOM()`)
    .limit(questionCount);

  // If not enough fresh questions, recycle old ones in "ARCHIVE RECONSTRUCTION MODE"
  let archiveMode = false;
  if (questions.length < questionCount && answeredIds.length > 0) {
    archiveMode = true;
    const remaining = questionCount - questions.length;
    const recycleConditions = [sql`${questionsTable.id} IN (${sql.join(answeredIds.map((id) => sql`${id}`), sql`, `)})`];
    if (selectedCategories.length > 0) {
      recycleConditions.push(sql`${questionsTable.category} IN (${sql.join(selectedCategories.map((c) => sql`${c}`), sql`, `)})`);
    }
    const recycled = await db.select().from(questionsTable)
      .where(and(...recycleConditions))
      .orderBy(sql`RANDOM()`)
      .limit(remaining);
    questions = [...questions, ...recycled];
  }

  // Final fallback: if STILL no questions, get any random questions in selected categories
  if (questions.length === 0) {
    const fallbackConds = [];
    if (selectedCategories.length > 0) {
      fallbackConds.push(sql`${questionsTable.category} IN (${sql.join(selectedCategories.map((c) => sql`${c}`), sql`, `)})`);
    }
    questions = await db.select().from(questionsTable)
      .where(fallbackConds.length > 0 ? and(...fallbackConds) : undefined)
      .orderBy(sql`RANDOM()`)
      .limit(questionCount);
  }

  // Add options to each question
  const result = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText })
      .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    const adjustedTime = q.timeLimitSeconds
      ? Math.max(5, Math.round(q.timeLimitSeconds * diffCfg.timerMult))
      : Math.round(30 * diffCfg.timerMult);
    return {
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      difficulty: q.difficulty,
      category: q.category,
      mediaUrl: q.mediaUrl,
      options,
      timeLimit: adjustedTime,
    };
  }));

  // Calculate threat level
  const threatLevel = calculateThreatLevel(domains.length, difficulty, modifiers);
  const estimatedXp = estimateXp(domains.length, difficulty, modifiers);

  // Log mission
  const [mission] = await db.insert(missionLogsTable).values({
    userId: user.id,
    domains,
    difficulty,
    modifiers: JSON.stringify(modifiers) as any,
    threatLevel,
    estimatedXp,
  }).returning();

  res.json({
    missionId: mission.id,
    threatLevel,
    threatLabel: THREAT_LABELS[threatLevel]?.label || "MODERATE",
    threatColor: THREAT_LABELS[threatLevel]?.color || "yellow",
    estimatedXp,
    archiveMode,
    difficulty: diffCfg.label,
    timerMultiplier: diffCfg.timerMult,
    xpMultiplier: diffCfg.xpMult,
    questions: result,
    totalQuestions: result.length,
  });
});

// POST /mission/complete — finalize mission results
router.post("/mission/complete", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { missionId, answers } = req.body;
  // answers: Array<{ questionId: number; correct: boolean; timeSpentMs: number }>

  const [mission] = await db.select().from(missionLogsTable).where(eq(missionLogsTable.id, missionId)).limit(1);
  if (!mission) { res.status(404).json({ error: "Mission not found" }); return; }

  const correctCount = answers.filter((a: any) => a.correct).length;
  const totalQuestions = answers.length;
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

  const diffCfg = DIFFICULTY_CONFIG[mission.difficulty] || DIFFICULTY_CONFIG.agent;
  const baseXpPerQuestion = 10 * diffCfg.xpMult;
  const totalXp = Math.round(answers.reduce((sum: number, a: any) => {
    if (a.correct) return sum + baseXpPerQuestion;
    return sum;
  }, 0));

  // Log answered questions
  for (const a of answers) {
    await db.insert(userAnsweredQuestionsTable).values({
      userId: user.id,
      questionId: a.questionId,
      correct: a.correct,
    }).onConflictDoNothing();
  }

  // Update mission log
  await db.update(missionLogsTable).set({
    totalXpGained: totalXp,
    questionsAnswered: totalQuestions,
    questionsCorrect: correctCount,
    completedAt: new Date(),
  }).where(eq(missionLogsTable.id, missionId));

  // Update user stats
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (stats) {
    const newXp = stats.xp + totalXp;
    const newLevel = calcLevel(newXp);
    await db.update(userStatsTable).set({
      xp: newXp,
      level: newLevel,
      streak: accuracy >= 0.5 ? stats.streak + 1 : 0,
      totalGames: stats.totalGames + 1,
      wins: accuracy >= 0.6 ? stats.wins + 1 : stats.wins,
      losses: accuracy < 0.6 ? stats.losses + 1 : stats.losses,
    }).where(eq(userStatsTable.userId, user.id));

    await db.insert(xpLogTable).values({ userId: user.id, action: "mission_complete", amount: totalXp });
  }

  res.json({
    missionId,
    correctCount,
    totalQuestions,
    accuracy: Math.round(accuracy * 100),
    totalXp,
    threatLevel: mission.threatLevel,
  });
});

export default router;