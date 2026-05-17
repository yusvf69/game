import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, userStatsTable, matchesTable, matchPlayersTable, questionsTable, questionOptionsTable } from "@workspace/db";
import { eq, sql, and, desc } from "drizzle-orm";

const XP_PER_LEVEL = 500;
function calcLevel(xp: number): number { return Math.floor(xp / XP_PER_LEVEL) + 1; }
function getRankTier(rp: number): string {
  if (rp >= 4000) return "Legend";
  if (rp >= 3000) return "Master";
  if (rp >= 2000) return "Diamond";
  if (rp >= 1500) return "Platinum";
  if (rp >= 1000) return "Gold";
  if (rp >= 500) return "Silver";
  return "Bronze";
}

interface QueuePlayer {
  userId: number;
  username: string;
  level: number;
  socketId: string;
  joinedAt: Date;
}

interface ActiveBattle {
  matchId: number;
  players: { userId: number; username: string; socketId: string; score: number; answers: number[] }[];
  questions: any[];
  currentQ: number;
  timer: ReturnType<typeof setTimeout> | null;
  endTime: number | null;
}

const matchmakingQueue: QueuePlayer[] = [];
const activeBattles: Map<number, ActiveBattle> = new Map();

async function getUserFromToken(token: string): Promise<{ id: number; username: string } | null> {
  try {
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
    if (!session || session.expiresAt < new Date()) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    return user || null;
  } catch { return null; }
}

let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

export function createSocketServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });
  ioInstance = io;

  io.use(async (socket, next) => {
    // Allow stage/buzzer connections without token
    const stageConn = socket.handshake.auth?.stage || socket.handshake.query?.stage;
    if (stageConn) { return next(); }

    const token = socket.handshake.auth?.token || socket.handshake.query?.token as string;
    if (!token) { return next(new Error("Authentication required")); }
    const user = await getUserFromToken(token);
    if (!user) { return next(new Error("Invalid or expired token")); }
    (socket as any).user = user;
    next();
  });

  io.on("connection", (socket) => {
    const stageConn = socket.handshake.auth?.stage || socket.handshake.query?.stage;
    const matchId = parseInt(socket.handshake.auth?.matchId || socket.handshake.query?.matchId || "0");

    if (stageConn && matchId) {
      socket.join(`stage:${matchId}`);
      socket.data.stageOnly = true;

      socket.on("stage:join", () => {
        socket.join(`stage:${matchId}`);
      });

      socket.on("disconnect", () => {});
      return;
    }

    const user = (socket as any).user as { id: number; username: string };
    if (!user) { socket.disconnect(); return; }
    socket.join(`user:${user.id}`);
    io.emit("user:online", { userId: user.id, username: user.username });

    // Allow host to join stage rooms for real-time events
    socket.on("stage:join", (data) => {
      const sMatchId = data?.matchId || socket.handshake.query?.matchId;
      if (sMatchId) socket.join(`stage:${sMatchId}`);
    });

    socket.on("matchmaking:join", async (data = {}) => {
      const existing = matchmakingQueue.find(p => p.userId === user.id);
      if (existing) return;

      const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
      const level = stats?.level || 1;

      matchmakingQueue.push({ userId: user.id, username: user.username, level, socketId: socket.id, joinedAt: new Date() });
      socket.emit("matchmaking:status", { inQueue: true, position: matchmakingQueue.length });

      if (matchmakingQueue.length >= 2) {
        const p1 = matchmakingQueue.shift()!;
        const p2 = matchmakingQueue.shift()!;
        startBattle(p1, p2);
      }
    });

    socket.on("matchmaking:leave", () => {
      const idx = matchmakingQueue.findIndex(p => p.userId === user.id);
      if (idx !== -1) matchmakingQueue.splice(idx, 1);
      socket.emit("matchmaking:status", { inQueue: false });
    });

    socket.on("battle:answer", async (data) => {
      const { matchId, questionIndex, optionId, timeMs } = data;
      const battle = activeBattles.get(matchId);
      if (!battle) return;

      const player = battle.players.find(p => p.userId === user.id);
      if (!player || player.answers[questionIndex] !== undefined) return;

      const question = battle.questions[questionIndex];
      if (!question) return;

      let correct = false;
      try {
        const [opt] = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.id, optionId)).limit(1);
        correct = opt?.isCorrect === 1;
      } catch {}

      if (correct) {
        const speedBonus = timeMs < 5000 ? 15 : timeMs < 10000 ? 8 : 0;
        player.score += 10 * (question.difficulty || 1) + speedBonus;
      }
      player.answers[questionIndex] = correct ? 1 : 0;

      io.to(`battle:${matchId}`).emit("battle:scores", {
        matchId,
        scores: battle.players.map(p => ({ userId: p.userId, username: p.username, score: p.score })),
      });

      const allAnswered = battle.players.every(p => p.answers[questionIndex] !== undefined);
      if (allAnswered && battle.currentQ === questionIndex) {
        nextQuestion(battle, matchId, io);
      }
    });

    socket.on("coop:join", (data) => {
      const { roomId } = data;
      socket.join(`coop:${roomId}`);
      socket.to(`coop:${roomId}`).emit("coop:player-joined", { userId: user.id, username: user.username });
    });

    socket.on("coop:progress", (data) => {
      const { roomId, progress } = data;
      socket.to(`coop:${roomId}`).emit("coop:update", { userId: user.id, progress });
    });

    socket.on("disconnect", () => {
      const qIdx = matchmakingQueue.findIndex(p => p.userId === user.id);
      if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
      io.emit("user:offline", { userId: user.id });
    });
  });

  return io;
}

async function startBattle(p1: QueuePlayer, p2: QueuePlayer) {
  const io = require("socket.io") as unknown as Server;

  const questions = await db.select().from(questionsTable).orderBy(sql`RANDOM()`).limit(5);
  const qs = await Promise.all(questions.map(async (q) => {
    const options = await db.select({ id: questionOptionsTable.id, text: questionOptionsTable.optionText })
      .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return { id: q.id, questionText: q.questionText, difficulty: q.difficulty, category: q.category, options, timeLimit: q.timeLimitSeconds };
  }));

  const [match] = await db.insert(matchesTable).values({ type: "pvp", status: "active" }).returning();
  await db.insert(matchPlayersTable).values({ matchId: match.id, userId: p1.userId, score: 0 });
  await db.insert(matchPlayersTable).values({ matchId: match.id, userId: p2.userId, score: 0 });

  const battle: ActiveBattle = {
    matchId: match.id,
    players: [
      { userId: p1.userId, username: p1.username, socketId: p1.socketId, score: 0, answers: [] },
      { userId: p2.userId, username: p2.username, socketId: p2.socketId, score: 0, answers: [] },
    ],
    questions: qs,
    currentQ: 0,
    timer: null,
    endTime: null,
  };
  activeBattles.set(match.id, battle);

  io.to(p1.socketId).emit("battle:start", { matchId: match.id, opponent: { userId: p2.userId, username: p2.username }, questions: qs, totalQuestions: qs.length });
  io.to(p2.socketId).emit("battle:start", { matchId: match.id, opponent: { userId: p1.userId, username: p1.username }, questions: qs, totalQuestions: qs.length });
}

function nextQuestion(battle: ActiveBattle, matchId: number, io: Server) {
  battle.currentQ++;
  if (battle.currentQ >= battle.questions.length) {
    endBattle(battle, matchId, io);
    return;
  }
  io.to(`battle:${matchId}`).emit("battle:next", { questionIndex: battle.currentQ });
}

async function endBattle(battle: ActiveBattle, matchId: number, io: Server) {
  for (const p of battle.players) {
    const correctCount = p.answers.filter(a => a === 1).length;
    const total = battle.questions.length;
    const accuracy = total > 0 ? correctCount / total : 0;
    const isWinner = accuracy >= 0.5;
    const xpGained = Math.round(p.score * 0.1 + (isWinner ? 50 : 10));
    const rankChange = isWinner ? 25 : -10;

    await db.update(matchPlayersTable).set({
      score: p.score, isWinner: isWinner ? 1 : 0, rankChange, correctAnswers: correctCount, totalQuestions: total,
    }).where(and(eq(matchPlayersTable.matchId, matchId), eq(matchPlayersTable.userId, p.userId)));

    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, p.userId)).limit(1);
    if (stats) {
      const newXp = stats.xp + xpGained;
      await db.update(userStatsTable).set({
        xp: newXp, level: calcLevel(newXp), rankPoints: Math.max(0, stats.rankPoints + rankChange),
        rankTier: getRankTier(Math.max(0, stats.rankPoints + rankChange)),
        totalGames: stats.totalGames + 1, wins: isWinner ? stats.wins + 1 : stats.wins,
        losses: !isWinner ? stats.losses + 1 : stats.losses,
      }).where(eq(userStatsTable.userId, p.userId));
    }

    const sio = io.sockets.sockets.get(p.socketId);
    if (sio) {
      sio.emit("battle:end", {
        matchId, isWinner: accuracy >= 0.5, score: p.score, xpGained, rankChange,
        correctAnswers: correctCount, totalQuestions: total,
        opponentScore: battle.players.find(op => op.userId !== p.userId)?.score || 0,
      });
    }
  }
  await db.update(matchesTable).set({ status: "finished", finishedAt: new Date() }).where(eq(matchesTable.id, matchId));
  activeBattles.delete(matchId);
}
