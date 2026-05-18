import { Router } from "express";
import { db } from "@workspace/db";
import {
  questionsTable,
  questionOptionsTable,
  stageMatchesTable,
  usersTable,
  sessionsTable,
  categoriesTable,
} from "@workspace/db";
import { getPool } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { eventBus } from "@workspace/game-engine";

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

interface StageEvent {
  type: string;
  teamId?: number | null;
  data?: any;
  timestamp: number;
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
  originalTimerSeconds: number;
  domainOrder: string[];
  currentDomain: string;
  domains: string[];
  difficulty: string;
  totalQuestions: number;
  buzzedOptionId: number | null;
  log: StageEvent[];
}

const stageMatchCache = new Map<number, StageMatchState>();

function pool() { return getPool(); }

async function ensureMatch(matchId: number, force = false): Promise<StageMatchState | undefined> {
  if (!force) {
    const cached = stageMatchCache.get(matchId);
    if (cached) return cached;
  }
  try {
    const { rows } = await pool().query(`SELECT state FROM stage_matches WHERE match_id = $1`, [matchId]);
    if (rows.length === 0) return undefined;
    const state = rows[0].state as StageMatchState;
    stageMatchCache.set(matchId, state);
    return state;
  } catch (e: any) {
    console.error("[stage] ensureMatch DB error:", e?.message);
    return undefined;
  }
}

function cacheMatch(state: StageMatchState): void {
  stageMatchCache.set(state.id, state);
}

function recordEvent(state: StageMatchState, type: string, teamId?: number | null, data?: any): void {
  state.log.push({
    type,
    teamId: teamId ?? null,
    data: data || null,
    timestamp: Date.now(),
  });
}

async function persistMatch(state: StageMatchState): Promise<void> {
  const insert = () => pool().query(
    `INSERT INTO stage_matches (match_id, host_id, room_code, state) VALUES ($1, $2, $3, $4)
     ON CONFLICT (match_id) DO UPDATE SET state = $4, updated_at = NOW()`,
    [state.id, state.hostId, state.roomCode, JSON.stringify(state)],
  );
  try {
    await insert();
  } catch (e: any) {
    if (e?.code === "42P01") {
      // Table doesn't exist — create it and retry
      try {
        await pool().query(`
          CREATE TABLE IF NOT EXISTS stage_matches (
            id SERIAL PRIMARY KEY,
            match_id BIGINT NOT NULL UNIQUE,
            host_id INTEGER NOT NULL,
            room_code VARCHAR(10) NOT NULL,
            state JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          )
        `);
      } catch (e2: any) {
        console.error("[stage] create table failed:", e2);
        throw new Error(`Failed to create stage_matches table: ${e2?.message || "unknown"}`);
      }
      await insert();
    } else if (e?.code === "22003") {
      // match_id too large for INTEGER → migrate to BIGINT
      try {
        await pool().query(`ALTER TABLE stage_matches ALTER COLUMN match_id TYPE BIGINT`);
      } catch (e2: any) {
        console.error("[stage] alter column failed:", e2);
        throw new Error(`Failed to migrate match_id column: ${e2?.message || "unknown"}`);
      }
      await insert();
    } else {
      console.error("[stage] persist failed:", e);
      throw new Error(`Failed to persist match: ${e?.message || "unknown"}`);
    }
  }
}

export async function getStageMatch(matchId: number): Promise<StageMatchState | undefined> {
  return ensureMatch(matchId);
}

export { cacheMatch, persistMatch };

let stageDomainCache: Record<string, string[]> | null = null;
let stageDomainCacheTime = 0;
const STAGE_CACHE_TTL = 60_000;
async function loadStageDomains(): Promise<Record<string, string[]>> {
  const now = Date.now();
  if (stageDomainCache && now - stageDomainCacheTime < STAGE_CACHE_TTL) return stageDomainCache;
  try {
    const all = await db.select().from(categoriesTable);
    const map: Record<string, string[]> = {};
    for (const cat of all) {
      const domain = cat.domain || "general";
      if (!map[domain]) map[domain] = [];
      if (!map[domain].includes(cat.name)) map[domain].push(cat.name);
    }
    stageDomainCache = map;
    stageDomainCacheTime = now;
    return map;
  } catch {
    return {};
  }
}

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
    originalTimerSeconds: timerSeconds || 30,
    domainOrder: domains || [],
    currentDomain: domains?.[0] || "general",
    domains: domains || [],
    difficulty: difficulty || "agent",
    totalQuestions: questionCount || 10,
    buzzedOptionId: null,
    log: [],
  };

  recordEvent(stageMatch, "match_created", null, { teamCount: teams.length, domains, difficulty });
  cacheMatch(stageMatch);
  await persistMatch(stageMatch);

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

  let match = Array.from(stageMatchCache.values()).find(m =>
    m.teams.some(t => t.code === teamCode.toUpperCase()),
  );
  if (!match) {
    const rows = await db.select().from(stageMatchesTable).limit(50);
    for (const row of rows) {
      const m = { ...(row.state as any), timer: null } as StageMatchState;
      if (m.teams.some(t => t.code === teamCode.toUpperCase())) { match = m; cacheMatch(m); break; }
    }
  }
  if (!match) { res.status(404).json({ error: "Invalid team code" }); return; }

  const team = match.teams.find(t => t.code === teamCode.toUpperCase());
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  if (!team.name) { res.status(400).json({ error: "Team not configured yet" }); return; }

  res.json({ matchId: match.id, teamId: team.id, teamName: team.name, teamColor: team.color, teamEmblem: team.emblem, roomCode: match.roomCode, tacticalLoadout: team.tacticalLoadout });
});

// POST /stage/team-config — host configures a team (name, color, emblem)
router.post("/stage/team-config", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, teamIndex, name, color, emblem } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can configure" }); return; }

  const team = match.teams[teamIndex];
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  if (name) team.name = name;
  if (color) team.color = color;
  if (emblem) team.emblem = emblem;
  recordEvent(match, "team_configured", team.id, { name, color, emblem });
  await persistMatch(match);

  res.json({ team });
});

// POST /stage/batch-config — configure all teams at once
router.post("/stage/batch-config", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, teams } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can configure" }); return; }

  for (const t of teams || []) {
    const team = match.teams[t.teamIndex];
    if (!team) continue;
    if (t.name) team.name = t.name;
    if (t.color) team.color = t.color;
    if (t.emblem) team.emblem = t.emblem;
    if (t.tacticalLoadout) team.tacticalLoadout = t.tacticalLoadout;
    recordEvent(match, "team_configured", team.id, { name: team.name, color: team.color, emblem: team.emblem });
  }
  await persistMatch(match);

  res.json({ success: true });
});

// POST /stage/start — start the stage match
router.post("/stage/start", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can start" }); return; }

  const namedTeams = match.teams.filter(t => t.name);
  if (namedTeams.length < 1) { res.status(400).json({ error: "Need at least 1 team" }); return; }

  const stageDomains = await loadStageDomains();
  const selectedCategories: string[] = [];
  for (const d of match.domains) {
    const cats = stageDomains[d];
    if (cats) selectedCategories.push(...cats);
  }

  const questions = await db.select().from(questionsTable)
    .where(selectedCategories.length > 0
      ? sql`${questionsTable.category} IN (${sql.join(selectedCategories.map(c => sql`${c}`), sql`, `)})`
      : undefined)
    .orderBy(sql`RANDOM()`)
    .limit(match.totalQuestions);

  const fullQs = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText, isCorrect: questionOptionsTable.isCorrect })
      .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    const correctIds = options.filter(o => o.isCorrect === 1).map(o => o.id);
    return {
      id: q.id,
      questionText: q.questionText,
      difficulty: q.difficulty,
      category: q.category,
      options: options.map(o => ({ id: o.id, text: o.text })),
      timeLimit: q.timeLimitSeconds || match.timerSeconds,
      type: q.type,
      correctOptionIds: correctIds,
    };
  }));

  match.questions = fullQs;
  match.totalQuestions = fullQs.length;
  match.currentQuestionIndex = 0;
  match.phase = "question";
  match.timerStartedAt = Date.now();
  match.currentDomain = match.domainOrder[0] || "general";
  match.buzzedOptionId = null;
  recordEvent(match, "match_started", null, { totalQuestions: fullQs.length });
  await persistMatch(match);

  eventBus.emitSync("MATCH_STARTED", {
    matchId: match.id,
    data: { totalQuestions: fullQs.length, teams: match.teams },
  });

  res.json({ success: true, totalQuestions: fullQs.length });
});

function stripAnswer(q: any) {
  if (!q) return q;
  const { correctOptionIds, ...rest } = q;
  return rest;
}

// POST /stage/buzz — team buzzes (no auth, supports rebuzz)
router.post("/stage/buzz", async (req, res) => {
  const { matchId, teamId } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.phase !== "question" && match.phase !== "rebuzz") { res.status(400).json({ error: "Not accepting buzzes" }); return; }
  if (match.buzzerTeamId !== null) { res.json({ success: false, reason: "already_buzzed" }); return; }

  match.buzzerTeamId = teamId;
  match.phase = "buzzed";
  recordEvent(match, "buzzer_pressed", teamId);
  await persistMatch(match);

  res.json({ success: true, teamId });
});

// POST /stage/answer — host clicks an option (server validates correct/incorrect, supports rebuzz)
router.post("/stage/answer", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId, optionId } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can mark answers" }); return; }
  if (match.buzzerTeamId === null) { res.status(400).json({ error: "No team has buzzed" }); return; }

  const team = match.teams.find(t => t.id === match.buzzerTeamId);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  const q = match.questions[match.currentQuestionIndex];
  const isCorrect = q && q.correctOptionIds?.includes(optionId);

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
    recordEvent(match, "answer_correct", team.id, { pointsGained, newScore: team.score });
    await persistMatch(match);

    const answerTimeMs = match.timerStartedAt ? Date.now() - match.timerStartedAt : 0;
    eventBus.emitSync("ANSWER_CORRECT", {
      matchId: match.id,
      teamId: team.id,
      userId: match.hostId,
      data: { xpAmount: pointsGained, questionIndex: match.currentQuestionIndex, answerTimeMs },
    });

    res.json({ success: true, correct: true, pointsGained, newScore: team.score });
    return;
  }

  // Wrong answer
  team.streak = 0;

  eventBus.emitSync("ANSWER_INCORRECT", {
    matchId: match.id,
    teamId: team.id,
    userId: match.hostId,
    data: { wrongAttempts: match.wrongAttempts },
  });

  if (match.wrongAttempts === 0) {
    // First wrong → give other teams a chance (rebuzz)
    match.wrongAttempts = 1;
    match.buzzerTeamId = null;
    match.buzzedOptionId = optionId;
    match.phase = "rebuzz";
    recordEvent(match, "answer_incorrect", team.id, { rebuzz: true });
    await persistMatch(match);

    res.json({ success: true, correct: false, pointsGained: 0, rebuzz: true });
    return;
  }

  // Second wrong → move on
  match.phase = "answered";
  match.wrongAttempts = 0;
  match.buzzedOptionId = optionId;
  recordEvent(match, "answer_incorrect", team.id, { final: true });
  await persistMatch(match);

  res.json({ success: true, correct: false, pointsGained: 0, newScore: team.score });
});

// POST /stage/next — host advances to next question
router.post("/stage/next", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can advance" }); return; }

  match.currentQuestionIndex++;
  match.buzzerTeamId = null;
  match.buzzedOptionId = null;
  match.wrongAttempts = 0;
  match.timerSeconds = match.originalTimerSeconds;

  if (match.currentQuestionIndex >= match.questions.length) {
    match.phase = "ended";
    recordEvent(match, "match_ended", null, { reason: "all_questions_answered" });

    const winner = match.teams.reduce((best, t) => !best || t.score > best.score ? t : best, match.teams[0]);
    eventBus.emitSync("MATCH_ENDED", {
      matchId: match.id,
      data: { teams: match.teams, winnerTeamId: winner?.id },
    });

    await persistMatch(match);
    res.json({ finished: true });
    return;
  }

  match.phase = "question";
  match.timerStartedAt = Date.now();
  recordEvent(match, "next_question", null, { questionIndex: match.currentQuestionIndex });
  await persistMatch(match);

  res.json({ success: true, currentQuestion: match.currentQuestionIndex });
});

// POST /stage/skip — skip current question
router.post("/stage/skip", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { matchId } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.hostId !== user.id) { res.status(403).json({ error: "Only host can skip" }); return; }

  match.buzzerTeamId = null;
  recordEvent(match, "question_skipped", null, { questionIndex: match.currentQuestionIndex });
  await persistMatch(match);

  res.json({ success: true });
});

// GET /stage/:id — get stage match state
router.get("/stage/:id", async (req, res) => {
  const matchId = parseInt(req.params.id);
  const match = await ensureMatch(matchId);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }

  // Auto-advance rebuzz → question on next poll (no setTimeout on Vercel)
  if (match.phase === "rebuzz" && match.buzzerTeamId === null) {
    match.phase = "question";
    match.timerStartedAt = Date.now();
    await persistMatch(match).catch(() => {});
  }

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

// POST /stage/timeout — handle timer expiry from frontend polling
router.post("/stage/timeout", async (req, res) => {
  const { matchId } = req.body;
  const match = await ensureMatch(matchId, true);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.phase === "question") {
    match.phase = "answered";
    recordEvent(match, "timer_expired", null, { questionIndex: match.currentQuestionIndex });
    await persistMatch(match).catch(() => {});
  }
  res.json({ success: true });
});

// POST /stage/seed-questions — DISABLED. Questions must be created via admin UI or import.
/* router.post("/stage/seed-questions", async (_req, res) => {
  res.status(410).json({ error: "Seed endpoint disabled. Use admin UI to create questions." });
}); */

export default router;
