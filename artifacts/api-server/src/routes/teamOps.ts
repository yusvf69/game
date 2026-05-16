import { Router } from "express";
import { db } from "@workspace/db";
import {
  teamOperationsTable,
  teamMembersTable,
  teamMatchesTable,
  teamMatchScoresTable,
  teamMatchQuestionsTable,
  usersTable,
  userStatsTable,
  sessionsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
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

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// POST /team/create — create a new team
router.post("/team/create", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { name, emblem, color, maxPlayers } = req.body;
  if (!name || name.length < 2) { res.status(400).json({ error: "Team name must be at least 2 characters" }); return; }

  const [team] = await db.insert(teamOperationsTable).values({
    name,
    emblem: emblem || "default",
    color: color || "blue",
    maxPlayers: maxPlayers || 4,
    captainId: user.id,
    tacticalLoadout: [],
  }).returning();

  await db.insert(teamMembersTable).values({ teamId: team.id, userId: user.id, isReady: true });

  res.json({ team });
});

// POST /team/join — join a team by ID
router.post("/team/join", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { teamId } = req.body;
  const [team] = await db.select().from(teamOperationsTable).where(eq(teamOperationsTable.id, teamId)).limit(1);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  const members = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, teamId));
  if (members.length >= team.maxPlayers) { res.status(400).json({ error: "Team is full" }); return; }

  const already = members.find(m => m.userId === user.id);
  if (already) { res.json({ team, member: already }); return; }

  const [member] = await db.insert(teamMembersTable).values({ teamId, userId: user.id }).returning();
  res.json({ team, member });
});

// POST /team/loadout — set tactical loadout (max 3)
router.post("/team/loadout", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { teamId, modules } = req.body;
  if (!Array.isArray(modules) || modules.length > 3) { res.status(400).json({ error: "Select up to 3 tactical modules" }); return; }

  const [team] = await db.select().from(teamOperationsTable).where(eq(teamOperationsTable.id, teamId)).limit(1);
  if (!team || team.captainId !== user.id) { res.status(403).json({ error: "Only the captain can set loadout" }); return; }

  await db.update(teamOperationsTable).set({ tacticalLoadout: modules as any }).where(eq(teamOperationsTable.id, teamId));
  res.json({ success: true, tacticalLoadout: modules });
});

// POST /team/match/create — create a new match room
router.post("/team/match/create", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { teamId, mode, domains, domainMode, difficulty } = req.body;

  const [team] = await db.select().from(teamOperationsTable).where(eq(teamOperationsTable.id, teamId)).limit(1);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  let roomCode = generateRoomCode();
  let existing = await db.select().from(teamMatchesTable).where(eq(teamMatchesTable.roomCode, roomCode)).limit(1);
  while (existing.length > 0) {
    roomCode = generateRoomCode();
    existing = await db.select().from(teamMatchesTable).where(eq(teamMatchesTable.roomCode, roomCode)).limit(1);
  }

  const [match] = await db.insert(teamMatchesTable).values({
    roomCode,
    type: mode || "battle",
    mode: mode || "live",
    domainOrder: (domains || []) as any,
    domainMode: domainMode || "randomized",
    difficulty: difficulty || "agent",
    hostId: user.id,
  }).returning();

  await db.insert(teamMatchScoresTable).values({ matchId: match.id, teamId: team.id });

  res.json({ match, roomCode });
});

// POST /team/match/join — join a match by room code
router.post("/team/match/join", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { roomCode, teamId } = req.body;
  const [match] = await db.select().from(teamMatchesTable).where(eq(teamMatchesTable.roomCode, roomCode)).limit(1);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.status !== "lobby") { res.status(400).json({ error: "Match already started" }); return; }

  const existing = await db.select().from(teamMatchScoresTable).where(and(
    eq(teamMatchScoresTable.matchId, match.id),
    eq(teamMatchScoresTable.teamId, teamId),
  )).limit(1);
  if (existing.length > 0) { res.json({ match }); return; }

  await db.insert(teamMatchScoresTable).values({ matchId: match.id, teamId });

  try {
    getIO().to(`match:${match.id}`).emit("team:player-joined", { teamId });
  } catch {}

  res.json({ match });
});

// POST /team/match/start — start the match (host only)
router.post("/team/match/start", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId } = req.body;
  const [match] = await db.select().from(teamMatchesTable).where(eq(teamMatchesTable.id, matchId)).limit(1);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can start" }); return; }

  const scores = await db.select().from(teamMatchScoresTable).where(eq(teamMatchScoresTable.matchId, matchId));
  if (scores.length < 1) { res.status(400).json({ error: "Need at least 1 team" }); return; }

  const { questionsTable, questionOptionsTable } = await import("@workspace/db");
  const { ne, desc: d } = await import("drizzle-orm");

  const questionCount = 10;
  const questions = await db.select().from(questionsTable)
    .orderBy(sql`RANDOM()`)
    .limit(questionCount);

  const qs = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText })
      .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return {
      id: q.id, questionText: q.questionText, difficulty: q.difficulty,
      category: q.category, options, timeLimit: q.timeLimitSeconds || 30,
      type: q.type,
    };
  }));

  await db.update(teamMatchesTable).set({
    status: "active",
    startedAt: new Date(),
    totalQuestions: qs.length,
  }).where(eq(teamMatchesTable.id, matchId));

  try {
    const io = getIO();
    io.to(`match:${matchId}`).emit("team:match-started", {
      matchId: match.id,
      roomCode: match.roomCode,
      totalQuestions: qs.length,
      teams: scores.map(s => ({ teamId: s.teamId, score: s.score })),
    });
    io.to(`match:${matchId}`).emit("team:next-question", {
      questionIndex: 0,
      question: qs[0],
      totalQuestions: qs.length,
    });
  } catch {}

  res.json({ success: true, totalQuestions: qs.length, questions: qs });
});

// POST /team/match/answer — submit answer (authoritative)
router.post("/team/match/answer", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, teamId, questionIndex, optionId, timeMs } = req.body;

  const [match] = await db.select().from(teamMatchesTable).where(eq(teamMatchesTable.id, matchId)).limit(1);
  if (!match || match.status !== "active") { res.status(400).json({ error: "Match not active" }); return; }

  const [score] = await db.select().from(teamMatchScoresTable).where(and(
    eq(teamMatchScoresTable.matchId, matchId),
    eq(teamMatchScoresTable.teamId, teamId),
  )).limit(1);
  if (!score) { res.status(404).json({ error: "Team not in match" }); return; }

  const { questionOptionsTable: qot } = await import("@workspace/db");
  const [opt] = await db.select({ isCorrect: qot.isCorrect }).from(qot).where(eq(qot.id, optionId)).limit(1);
  if (!opt) { res.status(400).json({ error: "Invalid option" }); return; }

  const isCorrect = opt.isCorrect === 1;
  const speedBonus = timeMs < 5000 ? 25 : timeMs < 10000 ? 15 : timeMs < 20000 ? 5 : 0;
  const streakBonus = score.currentStreak > 0 ? 50 : 0;
  const pointsGained = isCorrect ? (100 + speedBonus + streakBonus) : 0;

  const newStreak = isCorrect ? score.currentStreak + 1 : 0;

  await db.update(teamMatchScoresTable).set({
    score: score.score + pointsGained,
    correctAnswers: score.correctAnswers + (isCorrect ? 1 : 0),
    totalAnswers: score.totalAnswers + 1,
    currentStreak: newStreak,
    fastestAnswer: timeMs < 5000 ? true : score.fastestAnswer,
  }).where(and(eq(teamMatchScoresTable.matchId, matchId), eq(teamMatchScoresTable.teamId, teamId)));

  await db.insert(teamMatchQuestionsTable).values({
    matchId, questionIndex, questionId: 0,
    domain: match.currentDomain || "general",
    answeredBy: teamId, isCorrect, responseTimeMs: timeMs,
  });

  try {
    const io = getIO();
    io.to(`match:${matchId}`).emit("team:answer-result", {
      teamId, isCorrect, pointsGained, newScore: score.score + pointsGained,
      newStreak, questionIndex, responseTimeMs: timeMs,
    });

    // Check all teams answered for this question
    const allScores = await db.select().from(teamMatchScoresTable).where(eq(teamMatchScoresTable.matchId, matchId));
    const allAnswered = allScores.every(s => s.totalAnswers > questionIndex);
    if (allAnswered) {
      const nextIdx = questionIndex + 1;
      if (nextIdx >= (match.totalQuestions || 10)) {
        io.to(`match:${matchId}`).emit("team:match-ended", { matchId });
        await db.update(teamMatchesTable).set({ status: "finished", finishedAt: new Date() }).where(eq(teamMatchesTable.id, matchId));
      }
      // Next question will be sent when host advances or auto-advance
    }
  } catch {}

  res.json({ success: true, isCorrect, pointsGained, newScore: score.score + pointsGained, newStreak });
});

// POST /team/match/next — host advances to next question
router.post("/team/match/next", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, questions } = req.body;
  const [match] = await db.select().from(teamMatchesTable).where(eq(teamMatchesTable.id, matchId)).limit(1);
  if (!match || match.hostId !== user.id) { res.status(403).json({ error: "Only host can advance" }); return; }

  const nextQ = match.currentQuestion + 1;
  if (nextQ >= (match.totalQuestions || 10)) {
    try { getIO().to(`match:${matchId}`).emit("team:match-ended", { matchId }); } catch {}
    await db.update(teamMatchesTable).set({ status: "finished", finishedAt: new Date() }).where(eq(teamMatchesTable.id, matchId));
    res.json({ finished: true });
    return;
  }

  await db.update(teamMatchesTable).set({ currentQuestion: nextQ }).where(eq(teamMatchesTable.id, matchId));

  try {
    const io = getIO();
    const q = questions?.[nextQ];
    if (q) {
      io.to(`match:${matchId}`).emit("team:next-question", {
        questionIndex: nextQ, question: q, totalQuestions: match.totalQuestions,
      });
    }
  } catch {}

  res.json({ success: true, currentQuestion: nextQ });
});

// POST /team/match/buzz — stage mode buzzer (authoritative)
router.post("/team/match/buzz", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, teamId } = req.body;

  const [match] = await db.select().from(teamMatchesTable).where(eq(teamMatchesTable.id, matchId)).limit(1);
  if (!match || match.status !== "active") { res.status(400).json({ error: "Match not active" }); return; }

  // Check if already buzzed for this question
  const existingBuzz = await db.select().from(teamMatchQuestionsTable).where(and(
    eq(teamMatchQuestionsTable.matchId, matchId),
    eq(teamMatchQuestionsTable.questionIndex, match.currentQuestion),
  )).limit(1);

  if (existingBuzz.length > 0) {
    res.json({ success: false, reason: "already_buzzed" });
    return;
  }

  await db.insert(teamMatchQuestionsTable).values({
    matchId, questionIndex: match.currentQuestion, questionId: 0,
    domain: match.currentDomain || "general", buzzerTeam: teamId,
  });

  try {
    getIO().to(`match:${matchId}`).emit("team:buzz", {
      teamId, questionIndex: match.currentQuestion, timestamp: Date.now(),
    });
  } catch {}

  res.json({ success: true, teamId });
});

// GET /team/match/:id/scoreboard — get live scores
router.get("/team/match/:id/scoreboard", async (req, res) => {
  const scores = await db.select({
    teamId: teamMatchScoresTable.teamId,
    score: teamMatchScoresTable.score,
    correctAnswers: teamMatchScoresTable.correctAnswers,
    totalAnswers: teamMatchScoresTable.totalAnswers,
    currentStreak: teamMatchScoresTable.currentStreak,
  }).from(teamMatchScoresTable).where(eq(teamMatchScoresTable.matchId, parseInt(req.params.id)))
    .orderBy(sql`score DESC`);

  const teams = await Promise.all(scores.map(async (s) => {
    const [team] = await db.select({ name: teamOperationsTable.name, color: teamOperationsTable.color, emblem: teamOperationsTable.emblem })
      .from(teamOperationsTable).where(eq(teamOperationsTable.id, s.teamId)).limit(1);
    return { ...s, teamName: team?.name || "Unknown", color: team?.color || "blue", emblem: team?.emblem || "default" };
  }));

  res.json({ scores: teams });
});

// GET /team/list — list teams for current user
router.get("/team/list", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const memberships = await db.select({ teamId: teamMembersTable.teamId })
    .from(teamMembersTable).where(eq(teamMembersTable.userId, user.id));

  const teamIds = memberships.map(m => m.teamId);
  if (teamIds.length === 0) { res.json({ teams: [] }); return; }

  const teams = await Promise.all(teamIds.map(async (id) => {
    const [team] = await db.select().from(teamOperationsTable).where(eq(teamOperationsTable.id, id)).limit(1);
    if (!team) return null;
    const members = await db.select({
      userId: teamMembersTable.userId,
      isReady: teamMembersTable.isReady,
      username: usersTable.username,
    }).from(teamMembersTable)
      .leftJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
      .where(eq(teamMembersTable.teamId, id));
    return { ...team, members };
  }));

  res.json({ teams: teams.filter(Boolean) });
});

export default router;
