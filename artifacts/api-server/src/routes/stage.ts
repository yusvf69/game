import { Router } from "express";
import { db } from "@workspace/db";
import {
  questionsTable,
  questionOptionsTable,
  usersTable,
  sessionsTable,
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
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

function generateCode(length = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

interface StageTeam {
  id: number;
  name: string;
  color: string;
  emblem: string;
  code: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
  tacticalLoadout: string[];
}

interface StageMatchState {
  id: number;
  roomCode: string;
  hostId: number;
  teams: StageTeam[];
  questions: any[];
  currentQuestionIndex: number;
  phase: "lobby" | "intro" | "question" | "buzzed" | "answered" | "rebuzz" | "ended";
  buzzerTeamId: number | null;
  wrongAttempts: number;
  timerSeconds: number;
  timerStartedAt: number | null;
  timerDuration: number;
  timer: ReturnType<typeof setTimeout> | null;
  originalTimerSeconds: number;
  domainOrder: string[];
  currentDomain: string;
  domains: string[];
  difficulty: string;
  totalQuestions: number;
  buzzedOptionId: number | null;
}

const stageMatches = new Map<number, StageMatchState>();

export function getStageMatch(matchId: number): StageMatchState | undefined {
  return stageMatches.get(matchId);
}

const DOMAIN_CATEGORIES: Record<string, string[]> = {
  cyber_systems: ["technology", "security"],
  cognitive_analysis: ["logic", "intelligence"],
  historical_archives: ["history"],
  threat_intelligence: ["security", "intelligence"],
  scientific_division: ["technology"],
  behavioral_analysis: ["intelligence"],
  global_mapping: ["history", "technology"],
  cipher_division: ["security", "intelligence"],
};

const DIFFICULTY_CONFIG: Record<string, { diffRange: number[] }> = {
  recruit: { diffRange: [1, 3] },
  agent: { diffRange: [3, 6] },
  elite: { diffRange: [5, 8] },
  omega: { diffRange: [7, 10] },
};

const TEAM_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
const TEAM_EMBLEMS = ["raven", "wolf", "phoenix", "viper", "titan", "shadow", "ghost", "cipher"];

// POST /stage/create — create a stage match with per-team codes
router.post("/stage/create", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { teamCount, domains, difficulty, timerSeconds, questionCount } = req.body;
  if (!domains || domains.length === 0) { res.status(400).json({ error: "Select at least one domain" }); return; }

  const roomCode = generateCode(5);
  const matchId = Date.now() + Math.floor(Math.random() * 1000);
  const usedCodes = new Set<string>();

  const teams: StageTeam[] = [];
  for (let i = 0; i < (teamCount || 2); i++) {
    let code = generateCode(4);
    while (usedCodes.has(code)) code = generateCode(4);
    usedCodes.add(code);
    teams.push({
      id: i + 1,
      name: "",
      color: TEAM_COLORS[i % 8],
      emblem: TEAM_EMBLEMS[i % 8],
      code,
      score: 0,
      correct: 0,
      total: 0,
      streak: 0,
      tacticalLoadout: [],
    });
  }

  const stageMatch: StageMatchState = {
    id: matchId,
    roomCode,
    hostId: user.id,
    teams,
    questions: [],
    currentQuestionIndex: 0,
    phase: "lobby",
    buzzerTeamId: null,
    wrongAttempts: 0,
    timerSeconds: timerSeconds || 30,
    timerStartedAt: null,
    timerDuration: timerSeconds || 30,
    timer: null,
    originalTimerSeconds: timerSeconds || 30,
    domainOrder: domains || [],
    currentDomain: domains?.[0] || "general",
    domains: domains || [],
    difficulty: difficulty || "agent",
    totalQuestions: questionCount || 10,
    buzzedOptionId: null,
  };

  stageMatches.set(matchId, stageMatch);

  res.json({
    matchId,
    roomCode,
    teams: teams.map(t => ({ id: t.id, name: t.name, color: t.color, emblem: t.emblem, code: t.code })),
  });
});

// POST /stage/buzzer-connect — connect buzzer via team code (no auth, no name)
router.post("/stage/buzzer-connect", async (req, res) => {
  const { teamCode } = req.body;
  if (!teamCode) { res.status(400).json({ error: "Team code required" }); return; }

  const match = Array.from(stageMatches.values()).find(m =>
    m.teams.some(t => t.code === teamCode.toUpperCase()),
  );
  if (!match) { res.status(404).json({ error: "Invalid team code" }); return; }

  const team = match.teams.find(t => t.code === teamCode.toUpperCase());
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  if (!team.name) { res.status(400).json({ error: "Team not configured yet" }); return; }

  try {
    getIO().to(`stage:${match.id}`).emit("stage:team-joined", { teamId: team.id, name: team.name, color: team.color });
  } catch {}

  res.json({ matchId: match.id, teamId: team.id, teamName: team.name, teamColor: team.color, teamEmblem: team.emblem, roomCode: match.roomCode, tacticalLoadout: team.tacticalLoadout });
});

// POST /stage/team-config — host configures a team (name, color, emblem)
router.post("/stage/team-config", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, teamIndex, name, color, emblem } = req.body;
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can configure" }); return; }

  const team = match.teams[teamIndex];
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  if (name) team.name = name;
  if (color) team.color = color;
  if (emblem) team.emblem = emblem;

  res.json({ team });
});

// POST /stage/batch-config — configure all teams at once
router.post("/stage/batch-config", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, teams } = req.body;
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can configure" }); return; }

  for (const t of teams || []) {
    const team = match.teams[t.teamIndex];
    if (!team) continue;
    if (t.name) team.name = t.name;
    if (t.color) team.color = t.color;
    if (t.emblem) team.emblem = t.emblem;
    if (t.tacticalLoadout) team.tacticalLoadout = t.tacticalLoadout;
  }

  res.json({ success: true });
});

// POST /stage/start — start the stage match
router.post("/stage/start", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId } = req.body;
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can start" }); return; }

  const namedTeams = match.teams.filter(t => t.name);
  if (namedTeams.length < 1) { res.status(400).json({ error: "Need at least 1 team" }); return; }

  const selectedCategories: string[] = [];
  for (const d of match.domains) {
    const cats = DOMAIN_CATEGORIES[d];
    if (cats) selectedCategories.push(...cats);
  }

  const questions = await db.select().from(questionsTable)
    .where(selectedCategories.length > 0
      ? sql`${questionsTable.category} IN (${sql.join(selectedCategories.map(c => sql`${c}`), sql`, `)})`
      : undefined)
    .orderBy(sql`RANDOM()`)
    .limit(match.totalQuestions);

  const qs = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText })
      .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return {
      id: q.id,
      questionText: q.questionText,
      difficulty: q.difficulty,
      category: q.category,
      options,
      timeLimit: q.timeLimitSeconds || match.timerSeconds,
      type: q.type,
      // Include correct option ID for server-side validation
      correctOptionId: options.find(o => o.id)?.id, // Will be set below
    };
  }));

  // Re-fetch with isCorrect to get correct option IDs
  const fullQs = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText, isCorrect: questionOptionsTable.isCorrect })
      .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    const correctOpt = options.find(o => o.isCorrect === 1);
    return {
      id: q.id,
      questionText: q.questionText,
      difficulty: q.difficulty,
      category: q.category,
      options: options.map(o => ({ id: o.id, text: o.text })),
      timeLimit: q.timeLimitSeconds || match.timerSeconds,
      type: q.type,
      correctOptionId: correctOpt?.id || null,
    };
  }));

  match.questions = fullQs;
  match.totalQuestions = fullQs.length;
  match.currentQuestionIndex = 0;
  match.phase = "intro";
  match.currentDomain = match.domainOrder[0] || "general";
  match.buzzedOptionId = null;

  try {
    const io = getIO();
    io.to(`stage:${matchId}`).emit("stage:match-started", {
      matchId,
      totalQuestions: fullQs.length,
      teams: match.teams.filter(t => t.name).map(t => ({ id: t.id, name: t.name, color: t.color, emblem: t.emblem })),
    });

    if (fullQs.length > 0) {
      setTimeout(() => {
        if (!stageMatches.has(matchId)) return;
        match.phase = "question";
        const q = stripAnswer(fullQs[0]);
        io.to(`stage:${matchId}`).emit("stage:question", {
          questionIndex: 0,
          question: q,
          totalQuestions: fullQs.length,
          timerSeconds: fullQs[0].timeLimit || match.timerSeconds,
        });
        startTimer(match, io);
      }, 3000);
    }
  } catch {}

  res.json({ success: true, totalQuestions: fullQs.length });
});

function stripAnswer(q: any) {
  if (!q) return q;
  const { correctOptionId, ...rest } = q;
  return rest;
}

// POST /stage/buzz — team buzzes (no auth, supports rebuzz)
router.post("/stage/buzz", async (req, res) => {
  const { matchId, teamId } = req.body;
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.phase !== "question" && match.phase !== "rebuzz") { res.status(400).json({ error: "Not accepting buzzes" }); return; }
  if (match.buzzerTeamId !== null) { res.json({ success: false, reason: "already_buzzed" }); return; }

  match.buzzerTeamId = teamId;
  match.phase = "buzzed";
  stopTimer(match);

  try {
    const q = match.questions[match.currentQuestionIndex];
    const qWithoutAnswer = q ? stripAnswer(q) : null;
    getIO().to(`stage:${matchId}`).emit("stage:buzz", {
      teamId,
      teamName: match.teams.find(t => t.id === teamId)?.name || "Unknown",
      questionIndex: match.currentQuestionIndex,
      question: qWithoutAnswer,
      isRebuzz: match.wrongAttempts > 0,
    });
  } catch {}

  res.json({ success: true, teamId });
});

// POST /stage/answer — host clicks an option (server validates correct/incorrect, supports rebuzz)
router.post("/stage/answer", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, optionId } = req.body;
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can mark answers" }); return; }
  if (match.buzzerTeamId === null) { res.status(400).json({ error: "No team has buzzed" }); return; }

  const team = match.teams.find(t => t.id === match.buzzerTeamId);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  const q = match.questions[match.currentQuestionIndex];
  const isCorrect = q && q.correctOptionId === optionId;

  team.total += 1;

  // Points scale: rebuzz = half points
  const pointsMultiplier = match.wrongAttempts > 0 ? 0.5 : 1.0;
  const speedBonus = match.timerStartedAt ? (Date.now() - match.timerStartedAt < 5000 ? 25 : 15) : 0;
  const streakBonus = isCorrect && team.streak > 0 ? 50 : 0;
  const pointsGained = isCorrect ? Math.round((100 + speedBonus + streakBonus) * pointsMultiplier) : 0;

  if (isCorrect) {
    team.correct += 1;
    team.score += pointsGained;
    team.streak += 1;
    match.phase = "answered";
    match.wrongAttempts = 0;
    match.buzzedOptionId = optionId;

    try {
      getIO().to(`stage:${matchId}`).emit("stage:answer-result", {
        teamId: team.id,
        correct: true,
        pointsGained,
        newScore: team.score,
        newStreak: team.streak,
        correctOptionId: q?.correctOptionId || null,
      });
    } catch {}

    res.json({ success: true, correct: true, pointsGained, newScore: team.score });
    return;
  }

  // Wrong answer
  team.streak = 0;

  if (match.wrongAttempts === 0) {
    // First wrong → give other teams a chance (rebuzz)
    match.wrongAttempts = 1;
    match.buzzerTeamId = null;
    match.buzzedOptionId = optionId;
    match.phase = "rebuzz";

    // Half time for rebuzz
    const rebuzzTime = Math.max(5, Math.floor(match.originalTimerSeconds / 2));
    match.timerSeconds = rebuzzTime;

    try {
      const io = getIO();
      io.to(`stage:${matchId}`).emit("stage:answer-result", {
        teamId: team.id,
        correct: false,
        pointsGained: 0,
        newScore: team.score,
        newStreak: team.streak,
        correctOptionId: null,
        rebuzz: true,
        rebuzzTime,
        rebuzzTeamName: team.name,
      });
    } catch {}

    // Auto-start rebuzz timer after short delay
    setTimeout(() => {
      if (!stageMatches.has(matchId)) return;
      if (match.phase === "rebuzz") {
        match.phase = "question";
        match.timerStartedAt = Date.now();
        match.timer = setTimeout(() => {
          if (!stageMatches.has(matchId)) return;
          if (match.phase === "question" || match.phase === "rebuzz") {
            match.phase = "answered";
            match.wrongAttempts = 0;
            try {
              getIO().to(`stage:${matchId}`).emit("stage:timeout", { questionIndex: match.currentQuestionIndex });
            } catch {}
          }
        }, rebuzzTime * 1000);
        try {
          getIO().to(`stage:${matchId}`).emit("stage:rebuzz-open", { rebuzzTime, excludedTeamId: team.id, excludedTeamName: team.name });
        } catch {}
      }
    }, 1500);

    res.json({ success: true, correct: false, pointsGained: 0, rebuzz: true, rebuzzTime });
    return;
  }

  // Second wrong → move on
  match.phase = "answered";
  match.wrongAttempts = 0;
  match.buzzedOptionId = optionId;

  try {
    getIO().to(`stage:${matchId}`).emit("stage:answer-result", {
      teamId: team.id,
      correct: false,
      pointsGained: 0,
      newScore: team.score,
      newStreak: team.streak,
      correctOptionId: q?.correctOptionId || null,
    });
  } catch {}

  res.json({ success: true, correct: false, pointsGained: 0, newScore: team.score });
});

// POST /stage/next — host advances to next question
router.post("/stage/next", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId } = req.body;
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can advance" }); return; }

  match.currentQuestionIndex++;
  match.buzzerTeamId = null;
  match.buzzedOptionId = null;
  match.wrongAttempts = 0;
  match.timerSeconds = match.originalTimerSeconds;

  if (match.currentQuestionIndex >= match.questions.length) {
    match.phase = "ended";
    stopTimer(match);
    try {
      getIO().to(`stage:${matchId}`).emit("stage:match-ended", {
        matchId,
        teams: match.teams.filter(t => t.name).map(t => ({
          id: t.id, name: t.name, color: t.color, score: t.score, correct: t.correct, total: t.total, streak: t.streak,
        })),
      });
    } catch {}
    res.json({ finished: true });
    return;
  }

  const q = match.questions[match.currentQuestionIndex];
  match.phase = "question";

  try {
    const io = getIO();
    const qStrip = stripAnswer(q);
    io.to(`stage:${matchId}`).emit("stage:question", {
      questionIndex: match.currentQuestionIndex,
      question: qStrip,
      totalQuestions: match.totalQuestions,
      timerSeconds: q.timeLimit || match.timerSeconds,
    });
    startTimer(match, io);
  } catch {}

  res.json({ success: true, currentQuestion: match.currentQuestionIndex });
});

// POST /stage/skip — skip current question
router.post("/stage/skip", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId } = req.body;
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can skip" }); return; }

  stopTimer(match);
  match.buzzerTeamId = null;

  try {
    getIO().to(`stage:${matchId}`).emit("stage:question-skipped", { questionIndex: match.currentQuestionIndex });
  } catch {}

  res.json({ success: true });
});

// GET /stage/:id — get stage match state
router.get("/stage/:id", async (req, res) => {
  const matchId = parseInt(req.params.id);
  const match = stageMatches.get(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }

  const q = match.questions[match.currentQuestionIndex];
  const qStrip = q ? stripAnswer(q) : null;

  res.json({
    id: match.id,
    roomCode: match.roomCode,
    phase: match.phase,
    teams: match.teams.filter(t => t.name).map(t => ({
      id: t.id, name: t.name, color: t.color, emblem: t.emblem, code: t.code,
      score: t.score, correct: t.correct, total: t.total, streak: t.streak,
      tacticalLoadout: t.tacticalLoadout,
    })),
    currentQuestionIndex: match.currentQuestionIndex,
    totalQuestions: match.totalQuestions,
    currentDomain: match.currentDomain,
    buzzerTeamId: match.buzzerTeamId,
    wrongAttempts: match.wrongAttempts,
    originalTimerSeconds: match.originalTimerSeconds,
    timerSeconds: match.timerSeconds,
    question: qStrip,
    domains: match.domains,
    difficulty: match.difficulty,
  });
});

function startTimer(match: StageMatchState, io: any) {
  stopTimer(match);
  const duration = match.timerSeconds * 1000;
  match.timerStartedAt = Date.now();
  match.timerDuration = match.timerSeconds;

  match.timer = setTimeout(() => {
    if (!stageMatches.has(match.id)) return;
    if (match.phase === "question") {
      match.phase = "answered";
      io.to(`stage:${match.id}`).emit("stage:timeout", { questionIndex: match.currentQuestionIndex });
    }
  }, duration);
}

function stopTimer(match: StageMatchState) {
  if (match.timer) {
    clearTimeout(match.timer);
    match.timer = null;
  }
  match.timerStartedAt = null;
}

export default router;
