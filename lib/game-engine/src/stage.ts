import { db, getPool } from "@workspace/db";
import { questionsTable, questionOptionsTable, usersTable, sessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { eventBus } from "./events.js";
import { calculateStageScore } from "./scoring.js";

// ─── Types ────────────────────────────────────────────────────────────

export interface StageTeam {
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
  isBot?: boolean;
  userId?: number;
}

export interface StageEvent {
  type: string;
  teamId?: number | null;
  data?: any;
  timestamp: number;
}

export type StagePhase = "lobby" | "intro" | "question" | "buzzed" | "answered" | "rebuzz" | "paused" | "ended";

export interface StageQuestion {
  id: number;
  questionText: string;
  difficulty: number;
  category: string;
  options: { id: number; text: string }[];
  timeLimit: number;
  type: string;
  correctOptionIds: number[];
}

export interface StageMatchState {
  id: number;
  roomCode: string;
  hostId: number;
  teams: StageTeam[];
  questions: StageQuestion[];
  currentQuestionIndex: number;
  phase: StagePhase;
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
  previousPhase?: string;
  adminPaused?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────

export const DOMAIN_CATEGORIES: Record<string, string[]> = {
  cyber_systems: ["technology", "security"],
  cognitive_analysis: ["logic", "intelligence"],
  historical_archives: ["history"],
  threat_intelligence: ["security", "intelligence"],
  scientific_division: ["technology"],
  behavioral_analysis: ["intelligence"],
  global_mapping: ["history", "technology"],
  cipher_division: ["security", "intelligence"],
};

export const DIFFICULTY_CONFIG: Record<string, { diffRange: number[] }> = {
  recruit: { diffRange: [1, 3] },
  agent: { diffRange: [3, 6] },
  elite: { diffRange: [5, 8] },
  omega: { diffRange: [7, 10] },
};

export const TEAM_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
export const TEAM_EMBLEMS = ["raven", "wolf", "phoenix", "viper", "titan", "shadow", "ghost", "cipher"];

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// ─── Cache ────────────────────────────────────────────────────────────

const stageMatchCache = new Map<number, StageMatchState>();

// ─── Helpers ──────────────────────────────────────────────────────────

function generateCode(length = 5): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function pool() {
  return getPool();
}

function recordEvent(state: StageMatchState, type: string, teamId?: number | null, data?: any): void {
  state.log.push({
    type,
    teamId: teamId ?? null,
    data: data || null,
    timestamp: Date.now(),
  });
}

export function stripQuestion(q: StageQuestion) {
  if (!q) return q;
  const { correctOptionIds, ...rest } = q;
  return rest;
}

// ─── Persistence ─────────────────────────────────────────────────────

export function cacheMatch(state: StageMatchState): void {
  stageMatchCache.set(state.id, state);
}

export async function persistMatch(state: StageMatchState): Promise<void> {
  const stmt = () => pool().query(
    `INSERT INTO stage_matches (match_id, host_id, room_code, state)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (match_id) DO UPDATE SET state = $4, updated_at = NOW()`,
    [state.id, state.hostId, state.roomCode, JSON.stringify(state)],
  );

  try {
    await stmt();
  } catch (e: any) {
    if (e?.code === "42P01") {
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
      await stmt();
    } else if (e?.code === "22003") {
      await pool().query(`ALTER TABLE stage_matches ALTER COLUMN match_id TYPE BIGINT`);
      await stmt();
    } else {
      throw e;
    }
  }
}

export async function ensureMatch(matchId: number, force = false): Promise<StageMatchState | undefined> {
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
  } catch {
    return undefined;
  }
}

// ─── User Resolution ─────────────────────────────────────────────────

export async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

// ─── Domain Logic ─────────────────────────────────────────────────────

export function createMatch(
  user: { id: number },
  params: { teamCount?: number; domains?: string[]; difficulty?: string; timerSeconds?: number; questionCount?: number },
): StageMatchState {
  const matchId = Date.now() + Math.floor(Math.random() * 1000);
  const roomCode = generateCode(5);
  const usedCodes = new Set<string>();
  const teamCount = params.teamCount || 2;

  const teams: StageTeam[] = [];
  for (let i = 0; i < teamCount; i++) {
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

  const match: StageMatchState = {
    id: matchId,
    roomCode,
    hostId: user.id,
    teams,
    questions: [],
    currentQuestionIndex: 0,
    phase: "lobby",
    buzzerTeamId: null,
    wrongAttempts: 0,
    timerSeconds: params.timerSeconds || 30,
    timerStartedAt: null,
    timerDuration: params.timerSeconds || 30,
    originalTimerSeconds: params.timerSeconds || 30,
    domainOrder: params.domains || [],
    currentDomain: params.domains?.[0] || "general",
    domains: params.domains || [],
    difficulty: params.difficulty || "agent",
    totalQuestions: params.questionCount || 10,
    buzzedOptionId: null,
    log: [],
  };

  recordEvent(match, "match_created", null, { teamCount, domains: params.domains, difficulty: params.difficulty });
  return match;
}

export async function loadQuestions(match: StageMatchState): Promise<StageQuestion[]> {
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

  const fullQs: StageQuestion[] = await Promise.all(questions.map(async (q) => {
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

  return fullQs;
}

export function startMatch(match: StageMatchState, questions: StageQuestion[]): void {
  match.questions = questions;
  match.totalQuestions = questions.length;
  match.currentQuestionIndex = 0;
  match.phase = "question";
  match.timerStartedAt = Date.now();
  match.currentDomain = match.domainOrder[0] || "general";
  match.buzzedOptionId = null;
  recordEvent(match, "match_started", null, { totalQuestions: questions.length });
}

export function buzz(match: StageMatchState, teamId: number): { success: boolean; reason?: string } {
  if (match.phase !== "question" && match.phase !== "rebuzz") {
    return { success: false, reason: "Not accepting buzzes" };
  }
  if (match.buzzerTeamId !== null) {
    return { success: false, reason: "already_buzzed" };
  }

  match.buzzerTeamId = teamId;
  match.phase = "buzzed";
  recordEvent(match, "buzzer_pressed", teamId);
  return { success: true };
}

export function submitAnswer(
  match: StageMatchState,
  teamId: number,
  optionId: number,
): {
  correct: boolean;
  pointsGained: number;
  rebuzz: boolean;
  newScore: number;
} {
  const team = match.teams.find(t => t.id === teamId);
  if (!team) throw new Error("Team not found");

  const q = match.questions[match.currentQuestionIndex];
  const isCorrect = q && q.correctOptionIds.includes(optionId);

  team.total += 1;

  const score = calculateStageScore(isCorrect!, 0, team.streak, match.wrongAttempts);

  if (isCorrect) {
    team.correct += 1;
    team.score += score.pointsGained;
    team.streak += 1;
    match.phase = "answered";
    match.wrongAttempts = 0;
    match.buzzedOptionId = optionId;
    recordEvent(match, "answer_correct", teamId, { pointsGained: score.pointsGained, newScore: team.score });
    return { correct: true, pointsGained: score.pointsGained, rebuzz: false, newScore: team.score };
  }

  team.streak = 0;

  if (match.wrongAttempts === 0) {
    match.wrongAttempts = 1;
    match.buzzerTeamId = null;
    match.buzzedOptionId = optionId;
    match.phase = "rebuzz";
    recordEvent(match, "answer_incorrect", teamId, { rebuzz: true });
    return { correct: false, pointsGained: 0, rebuzz: true, newScore: team.score };
  }

  match.phase = "answered";
  match.wrongAttempts = 0;
  match.buzzedOptionId = optionId;
  recordEvent(match, "answer_incorrect", teamId, { final: true });
  return { correct: false, pointsGained: 0, rebuzz: false, newScore: team.score };
}

export function nextQuestion(match: StageMatchState): { finished: boolean } {
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

    return { finished: true };
  }

  match.phase = "question";
  match.timerStartedAt = Date.now();
  recordEvent(match, "next_question", null, { questionIndex: match.currentQuestionIndex });
  return { finished: false };
}

export function skipQuestion(match: StageMatchState): void {
  match.buzzerTeamId = null;
  recordEvent(match, "question_skipped", null, { questionIndex: match.currentQuestionIndex });
}

export function handleTimeout(match: StageMatchState): boolean {
  if (match.phase === "question") {
    match.phase = "answered";
    recordEvent(match, "timer_expired", null, { questionIndex: match.currentQuestionIndex });
    return true;
  }
  return false;
}

export function addBotTeam(
  match: StageMatchState,
  botName: string,
  difficulty: string,
): StageTeam {
  const DIFFICULTY_SKILL: Record<string, { accuracy: number; avgBuzzMs: number; buzzVariance: number }> = {
    recruit: { accuracy: 0.45, avgBuzzMs: 8000, buzzVariance: 4000 },
    agent: { accuracy: 0.60, avgBuzzMs: 6000, buzzVariance: 3000 },
    elite: { accuracy: 0.78, avgBuzzMs: 4000, buzzVariance: 2000 },
    omega: { accuracy: 0.92, avgBuzzMs: 2500, buzzVariance: 1500 },
  };

  const bot: StageTeam = {
    id: 1000 + match.teams.length,
    name: botName,
    color: TEAM_COLORS[match.teams.length % 8],
    emblem: "ai-" + (match.teams.length + 1),
    code: `AI-${match.teams.length + 1}`,
    score: 0,
    correct: 0,
    total: 0,
    streak: 0,
    tacticalLoadout: [],
    isBot: true,
  };

  match.teams.push(bot);
  return bot;
}

export function getMatchState(match: StageMatchState) {
  const q = match.questions[match.currentQuestionIndex];
  return {
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
    question: stripQuestion(q),
    domains: match.domains,
    difficulty: match.difficulty,
  };
}

export async function getMatchForReplay(matchId: number) {
  const { rows } = await getPool().query(`SELECT * FROM stage_matches WHERE match_id = $1`, [matchId]);
  if (rows.length === 0) return null;
  const state = rows[0].state as StageMatchState;
  return {
    matchId: rows[0].match_id,
    roomCode: rows[0].room_code,
    teams: state.teams.filter((t: StageTeam) => t.name),
    questions: state.questions.map(stripQuestion),
    log: state.log,
    phase: state.phase,
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at,
  };
}

export async function listReplays() {
  const { rows } = await getPool().query(
    `SELECT match_id, room_code, host_id, state, created_at, updated_at
     FROM stage_matches
     WHERE state->>'phase' = 'ended'
     ORDER BY updated_at DESC LIMIT 50`
  );
  return rows.map((r: any) => ({
    matchId: r.match_id,
    roomCode: r.room_code,
    hostId: r.host_id,
    teamCount: (r.state?.teams || []).filter((t: StageTeam) => t.name).length,
    totalQuestions: r.state?.totalQuestions || 0,
    phases: r.state?.log?.length || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getStageMatch(matchId: number): Promise<StageMatchState | undefined> {
  return ensureMatch(matchId);
}
