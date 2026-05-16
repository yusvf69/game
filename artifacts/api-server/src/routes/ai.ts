import { Router } from "express";
import { db } from "@workspace/db";
import {
  aiPlayerProfilesTable,
  userStatsTable,
  sessionsTable,
  usersTable,
  xpLogTable,
  answerLogsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { getIO } from "../socket";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const narrationTemplates: Record<string, string[]> = {
  tense: [
    "The clock ticks. Every second brings you closer to the truth — or to failure.",
    "Static fills the feed. Something is watching. Something has always been watching.",
    "The Archive never sleeps. Neither can you. Not tonight.",
  ],
  calm: [
    "The operation unfolds as planned. For now, the silence is a gift.",
    "In the quiet between transmissions, truth crystallizes.",
    "Agent — the next move is yours. Choose carefully.",
  ],
  triumphant: [
    "Another cipher broken. The Archive acknowledges your brilliance.",
    "You have pierced the veil. The coordinates are clear. The mission continues.",
    "Exceptional. Your pattern recognition rivals our finest analysts.",
  ],
  mysterious: [
    "The signal has no origin. The frequency matches no known Archive station.",
    "There are questions that have no answers. And answers that spawn new questions.",
    "CLASSIFIED EYES ONLY — the rest of the truth is buried beneath the surface.",
  ],
  urgent: [
    "ALERT: Hostile actors detected in the network. Proceed with maximum caution.",
    "Window closing. You have 60 seconds to make the right call.",
    "The Archive is under threat. Your analysis is the only thing standing between order and chaos.",
  ],
};

router.post("/ai/narrate", async (req, res) => {
  const { context, mood, characterName } = req.body;

  const templates = narrationTemplates[mood] || narrationTemplates.mysterious;
  const text = templates[Math.floor(Math.random() * templates.length)];
  const finalText = characterName ? `[${characterName}]: ${text}` : text;

  res.json({ text: finalText, mood });
});

router.post("/ai/explain", async (req, res) => {
  const { questionId, correctAnswer, userAnswer, category } = req.body;

  const explanations: Record<string, string[]> = {
    science: [
      `The correct answer is "${correctAnswer}". This is a fundamental principle of ${category || "science"} that underpins many modern technologies.`,
      `"${correctAnswer}" is correct. Understanding this concept is critical for any analyst operating in the field.`,
    ],
    history: [
      `The answer is "${correctAnswer}". This event shaped the trajectory of human civilization in ways we still feel today.`,
      `"${correctAnswer}" — history is the intelligence of the past informing the decisions of the future.`,
    ],
    default: [
      `The correct answer is "${correctAnswer}". ${userAnswer !== correctAnswer ? `You selected "${userAnswer}", which was incorrect.` : "Well done."} This concept appears frequently in Archive intelligence assessments.`,
      `"${correctAnswer}" is the precise answer. The Archive rewards precision over approximation.`,
    ],
  };

  const catKey = Object.keys(explanations).find((k) => category?.toLowerCase().includes(k)) || "default";
  const pool = explanations[catKey];
  const explanation = pool[Math.floor(Math.random() * pool.length)];

  res.json({
    explanation,
    additionalFacts: [
      "This topic appears in 23% of Archive field assessments.",
      "Top agents score above 80% in this category.",
      `Category: ${category || "General Intelligence"}`,
    ],
  });
});

router.get("/ai/player-profile", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [profile] = await db.select().from(aiPlayerProfilesTable).where(eq(aiPlayerProfilesTable.userId, user.id)).limit(1);
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);

  const logs = await db.select().from(answerLogsTable).where(eq(answerLogsTable.userId, user.id)).orderBy(desc(answerLogsTable.createdAt)).limit(100);
  const recentLogs = await db.select().from(xpLogTable).where(eq(xpLogTable.userId, user.id)).orderBy(desc(xpLogTable.createdAt)).limit(10);

  const totalLogs = logs.length;
  const correctLogs = logs.filter((l) => l.correct === 1);
  const accuracy = totalLogs > 0 ? correctLogs.length / totalLogs : 0;

  // Category performance for strengths/weaknesses
  const catPerformance: Record<string, { correct: number; total: number; avgTime: number }> = {};
  for (const log of logs) {
    if (!catPerformance[log.category]) catPerformance[log.category] = { correct: 0, total: 0, avgTime: 0 };
    catPerformance[log.category].total++;
    if (log.correct === 1) catPerformance[log.category].correct++;
  }
  for (const cat of Object.keys(catPerformance)) {
    catPerformance[cat].avgTime = logs.filter((l) => l.category === cat).reduce((s, l) => s + l.timeSpentMs, 0) / catPerformance[cat].total;
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [cat, perf] of Object.entries(catPerformance)) {
    const catAcc = perf.correct / perf.total;
    if (catAcc >= 0.75 && perf.total >= 2) strengths.push(`${cat} (${Math.round(catAcc * 100)}%)`);
    else if (catAcc < 0.5 && perf.total >= 2) weaknesses.push(`${cat} (${Math.round(catAcc * 100)}%)`);
  }
  if (strengths.length === 0) strengths.push("developing");
  if (weaknesses.length === 0) weaknesses.push("unseasoned");

  // Difficulty performance
  const diffPerformance: Record<number, { correct: number; total: number }> = {};
  for (const log of logs) {
    if (!diffPerformance[log.difficulty]) diffPerformance[log.difficulty] = { correct: 0, total: 0 };
    diffPerformance[log.difficulty].total++;
    if (log.correct === 1) diffPerformance[log.difficulty].correct++;
  }

  // Speed metrics
  const avgTimePerQuestion = totalLogs > 0 ? logs.reduce((s, l) => s + l.timeSpentMs, 0) / totalLogs : 30000;
  const speedScore = Math.max(0, Math.min(100, Math.round(100 - (avgTimePerQuestion / 60000) * 100)));

  // Win rate from recent XP logs
  const winActions = recentLogs.filter((l) => l.action.includes("win")).length;
  const totalActions = recentLogs.length;
  const winRate = totalActions > 0 ? winActions / totalActions : 0;

  const intelligenceScore = Math.min(100, Math.round(accuracy * 40 + speedScore * 0.2 + winRate * 20 + (stats?.streak || 0) * 2));
  const behaviorType = accuracy > 0.75 ? "strategic" : accuracy > 0.5 ? "explorer" : "learner";
  const recommendedDifficulty = Math.min(10, Math.max(1, stats?.level || 1));

  // Psychological profiling
  const tacticalIQ = Math.min(100, Math.round(accuracy * 50 + speedScore * 0.3 + (stats?.level || 1) * 3));
  const avgTimeCapped = Math.min(avgTimePerQuestion, 60000);
  const riskIndex = Math.min(100, Math.round((avgTimeCapped / 60000) * 30 + (1 - accuracy) * 40 + (stats?.streak || 0) * 3));
  const loyaltyScore = Math.min(100, Math.round((stats?.streak || 0) * 5 + winRate * 30 + (stats?.xp || 0) / 200));

  if (profile) {
    await db.update(aiPlayerProfilesTable).set({
      intelligenceScore,
      behaviorType,
      recommendedDifficulty,
      strengths,
      weaknesses,
      tacticalIQ,
      riskIndex,
      loyaltyScore,
    }).where(eq(aiPlayerProfilesTable.userId, user.id));
  }

  res.json({
    userId: user.id,
    strengths,
    weaknesses,
    behaviorType,
    intelligenceScore,
    learningCurve: intelligenceScore > 70 ? "accelerated" : intelligenceScore > 40 ? "steady" : "developing",
    recommendedDifficulty,
    tacticalIQ,
    riskIndex,
    loyaltyScore,
  });
});

// Director message templates per behavioral context
const directorMessages: Record<string, string[]> = {
  trust_vale: [
    "WE SAW YOU TRUST VALE. The Archive notes your capacity for faith. This will be catalogued.",
    "You extended trust to Vale. An interesting variable. We will monitor how this choice propagates.",
    "Trust is a vector. You chose to open that channel with Vale. The signal is logged.",
  ],
  suspicious_vale: [
    "You doubted Vale. Prudent. The Archive values critical judgment above blind allegiance.",
    "Suspicion is a survival mechanism. Your distrust of Vale has been recorded in your permanent profile.",
    "You questioned Vale's motives. This aligns with our assessment of high-agency operators.",
  ],
  diplomatic_vale: [
    "You chose diplomacy. The calibrated approach. The Archive respects measured responses.",
    "A diplomatic resolution. You understand that information warfare requires finesse, not force.",
  ],
  betrayal: [
    "BETRAYAL DETECTED. Your actions suggest a capacity for deception that exceeds standard parameters.",
    "You have demonstrated that loyalty is conditional for you. The Archive will adjust its threat model accordingly.",
  ],
  pattern_analyst: [
    "Your answer patterns reveal a methodical mind. You verify before you trust. This is noted.",
    "Analytical consistency detected. Your problem-solving approach resembles our top field agents.",
  ],
  speed_demon: [
    "You make decisions with remarkable speed. Decisiveness is a double-edged sword in this work.",
    "Fast responses. The Archive tracks your reaction times. You may be suited for rapid-response deployments.",
  ],
  cautious: [
    "Deliberate. Measured. You take time to assess before committing. This patience has saved lives in the field.",
    "Your response latency suggests a cautious temperament. The Archive has suitable roles for analysts like you.",
  ],
  streak: [
    "A STREAK OF CORRECT ANSWERS. The probability of this by chance is diminishing. You are being watched.",
    "Consistent accuracy. Either you are exceptionally skilled — or you know more than you should.",
  ],
  comeback: [
    "You recovered from failure. Resilience is not taught. It is identified. The Archive has identified yours.",
  ],
  weak: [
    "Multiple errors detected in your recent assessments. The Director suggests recalibration.",
    "Failure rate trending upward. Perhaps you need rest. Or perhaps the pressure is revealing your limits.",
  ],
};

router.post("/ai/director-report", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { context } = req.body;

  const logs = await db.select().from(answerLogsTable).where(eq(answerLogsTable.userId, user.id)).orderBy(desc(answerLogsTable.createdAt)).limit(20);
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);

  const totalLogs = logs.length;
  const correctLogs = logs.filter((l) => l.correct === 1).length;
  const recentCorrect = logs.slice(0, 5).filter((l) => l.correct === 1).length;
  const avgTime = totalLogs > 0 ? logs.reduce((s, l) => s + l.timeSpentMs, 0) / totalLogs : 0;

  let templates: string[];
  const behaviorKey = context || "generic";

  if (directorMessages[behaviorKey]) {
    templates = directorMessages[behaviorKey];
  } else if (recentCorrect >= 5) {
    templates = directorMessages.streak;
  } else if (avgTime < 5000 && totalLogs >= 3) {
    templates = directorMessages.speed_demon;
  } else if (avgTime > 20000 && totalLogs >= 3) {
    templates = directorMessages.cautious;
  } else if (totalLogs >= 5 && correctLogs / totalLogs > 0.8) {
    templates = directorMessages.pattern_analyst;
  } else if (totalLogs >= 3 && correctLogs / totalLogs < 0.3) {
    templates = directorMessages.weak;
  } else {
    templates = [
      "The Director is analysing your behavioural patterns. More data is required for a meaningful assessment.",
      "Your actions are being processed through the Archive's behavioural matrix. Results are inconclusive.",
      "Continue your operations. The Director will issue further observations as patterns emerge.",
    ];
  }

  const text = templates[Math.floor(Math.random() * templates.length)];
  const finalText = `[AI DIRECTOR]: ${text}`;

  // Emit real-time via Socket.IO
  try {
    getIO().to(`user:${user.id}`).emit("director:message", { text: finalText });
  } catch {}

  res.json({
    text: finalText,
    analyzed: totalLogs >= 3,
    totalAnswers: totalLogs,
    accuracy: totalLogs > 0 ? Math.round((correctLogs / totalLogs) * 100) : 0,
  });
});

export default router;
