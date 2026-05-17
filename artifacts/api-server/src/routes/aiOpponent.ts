import { Router } from "express";
import { db, getPool } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getStageMatch } from "./stage.js";

const router = Router();

const BOT_NAMES = [
  "Cipher-7", "Nexus-9", "Phantom-X", "Void-3", "Aegis-1",
  "Omega-5", "Delta-Z", "Sigma-4", "Talon-6", "Wraith-2",
];

const BOT_COLORS = ["#a855f7", "#14b8a6", "#f97316", "#06b6d4", "#d946ef"];
const BOT_EMBLEMS = ["ai-1", "ai-2", "ai-3", "ai-4", "ai-5"];

const DIFFICULTY_SKILL: Record<string, { accuracy: number; avgBuzzMs: number; buzzVariance: number }> = {
  recruit: { accuracy: 0.45, avgBuzzMs: 8000, buzzVariance: 4000 },
  agent: { accuracy: 0.60, avgBuzzMs: 6000, buzzVariance: 3000 },
  elite: { accuracy: 0.78, avgBuzzMs: 4000, buzzVariance: 2000 },
  omega: { accuracy: 0.92, avgBuzzMs: 2500, buzzVariance: 1500 },
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gaussianRandom(mean: number, variance: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(1000, mean + z * variance);
}

// POST /stage/ai-opponent/add — adds AI bots to a stage match
router.post("/stage/ai-opponent/add", async (req, res) => {
  const { matchId, botCount, difficulty } = req.body;
  const count = Math.min(botCount || 1, 5);

  const match = await getStageMatch(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }

  const bots = [];
  for (let i = 0; i < count; i++) {
    const bot = {
      id: 1000 + match.teams.length + i,
      name: pickRandom(BOT_NAMES),
      color: BOT_COLORS[i % BOT_COLORS.length],
      emblem: BOT_EMBLEMS[i % BOT_EMBLEMS.length],
      code: `AI-${match.teams.length + i + 1}`,
      score: 0,
      correct: 0,
      total: 0,
      streak: 0,
      tacticalLoadout: [],
      isBot: true,
      skill: DIFFICULTY_SKILL[difficulty || "agent"],
    };
    match.teams.push(bot as any);
    bots.push({ id: bot.id, name: bot.name, color: bot.color, emblem: bot.emblem });
  }

  const { persistMatch, cacheMatch } = await import("./stage.js");
  cacheMatch(match);
  await persistMatch(match);

  res.json({ success: true, bots });
});

// POST /stage/ai-opponent/tick — AI makes decisions for one match
router.post("/stage/ai-opponent/tick", async (req, res) => {
  const { matchId } = req.body;
  const match = await getStageMatch(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }

  if (match.phase !== "question") {
    res.json({ action: "waiting", phase: match.phase });
    return;
  }
  if (match.buzzerTeamId !== null) {
    res.json({ action: "waiting", reason: "already_buzzed" });
    return;
  }

  const botTeams = match.teams.filter((t: any) => (t as any).isBot) as any[];
  if (botTeams.length === 0) {
    res.json({ action: "no_bots" });
    return;
  }

  const { persistMatch, cacheMatch } = await import("./stage.js");

  // Each bot decides independently whether to buzz this tick
  const elapsed = Date.now() - (match.timerStartedAt || Date.now());

  for (const bot of botTeams) {
    const skill = bot.skill || DIFFICULTY_SKILL.agent;
    // Probability of buzzing increases as time approaches avgBuzzMs
    const buzzChance = Math.min(0.3, elapsed / (skill.avgBuzzMs * 3));
    if (Math.random() < buzzChance && match.buzzerTeamId === null) {
      // Bot buzzes
      match.buzzerTeamId = bot.id;
      match.phase = "buzzed";

      // Determine if bot gets the answer correct
      const q = match.questions[match.currentQuestionIndex];
      let willBeCorrect = false;
      if (q && q.correctOptionIds?.length > 0) {
        const firstCorrect = q.correctOptionIds[0];
        willBeCorrect = Math.random() < skill.accuracy;
        if (willBeCorrect) {
          match.buzzedOptionId = firstCorrect;
        } else {
          const wrongOptions = q.options?.filter((o: any) => !q.correctOptionIds.includes(o.id)) || [];
          match.buzzedOptionId = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]?.id || null;
        }
      }

      const team = match.teams.find((t: any) => t.id === bot.id);
      if (team) {
        team.total += 1;
        if (willBeCorrect) {
          team.score += 100;
          team.correct += 1;
          team.streak += 1;
        } else {
          team.streak = 0;
        }
      }

      match.wrongAttempts = willBeCorrect ? 0 : 1;
      match.phase = willBeCorrect ? "answered" : "rebuzz";

      cacheMatch(match);
      await persistMatch(match);

      res.json({
        action: "buzzed",
        botId: bot.id,
        botName: bot.name,
        correct: willBeCorrect,
        phase: match.phase,
      });
      return;
    }
  }

  res.json({ action: "no_buzz", botCount: botTeams.length });
});

export default router;
