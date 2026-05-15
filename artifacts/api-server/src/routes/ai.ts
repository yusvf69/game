import { Router } from "express";
import { db } from "@workspace/db";
import {
  aiPlayerProfilesTable,
  userStatsTable,
  sessionsTable,
  usersTable,
  xpLogTable,
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
  const recentLogs = await db.select().from(xpLogTable).where(eq(xpLogTable.userId, user.id)).orderBy(desc(xpLogTable.createdAt)).limit(10);

  const winActions = recentLogs.filter((l) => l.action.includes("win")).length;
  const totalActions = recentLogs.length;
  const winRate = totalActions > 0 ? winActions / totalActions : 0;

  const intelligenceScore = Math.min(100, Math.round((stats?.xp || 0) / 50 + winRate * 30 + (stats?.streak || 0) * 2));
  const behaviorType = winRate > 0.7 ? "strategic" : winRate > 0.4 ? "explorer" : "learner";
  const recommendedDifficulty = Math.min(10, Math.max(1, stats?.level || 1));

  if (profile) {
    await db.update(aiPlayerProfilesTable).set({
      intelligenceScore,
      behaviorType,
      recommendedDifficulty,
    }).where(eq(aiPlayerProfilesTable.userId, user.id));
  }

  res.json({
    userId: user.id,
    strengths: profile?.strengths || ["pattern recognition", "logical deduction"],
    weaknesses: profile?.weaknesses || ["time pressure", "history category"],
    behaviorType,
    intelligenceScore,
    learningCurve: intelligenceScore > 70 ? "accelerated" : intelligenceScore > 40 ? "steady" : "developing",
    recommendedDifficulty,
  });
});

export default router;
