import { db, getPool } from "@workspace/db";
import { xpLogTable, analyticsEventsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export type GameEventType =
  | "ANSWER_CORRECT"
  | "ANSWER_INCORRECT"
  | "BUZZER_PRESSED"
  | "MATCH_STARTED"
  | "MATCH_ENDED"
  | "MATCH_PAUSED"
  | "MATCH_RESUMED"
  | "TIMER_EXPIRED"
  | "QUESTION_SKIPPED"
  | "TEAM_SCORED"
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "STREAK_BROKEN"
  | "LEVEL_UP"
  | "ACHIEVEMENT_UNLOCKED"
  | "XP_EARNED"
  | "REBUZZ_OPPORTUNITY";

export interface GameEvent {
  type: GameEventType;
  matchId?: number;
  teamId?: number | null;
  userId?: number;
  data?: Record<string, unknown>;
  timestamp: number;
}

type EventListener = (event: GameEvent) => void | Promise<void>;

class EventBus {
  private listeners = new Map<GameEventType, EventListener[]>();

  on(type: GameEventType, listener: EventListener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  off(type: GameEventType, listener: EventListener) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter(l => l !== listener));
  }

  async emit(type: GameEventType, event: Partial<GameEvent>) {
    const fullEvent: GameEvent = {
      type,
      timestamp: Date.now(),
      ...event,
    };

    const list = this.listeners.get(type) || [];
    const globalList = this.listeners.get("*" as any) || [];

    for (const listener of [...list, ...globalList]) {
      try {
        await Promise.resolve(listener(fullEvent));
      } catch (e) {
        console.error(`[events] Listener error for ${type}:`, e);
      }
    }
  }

  emitSync(type: GameEventType, event: Partial<GameEvent>) {
    this.emit(type, event).catch(() => {});
  }
}

export const eventBus = new EventBus();

// ─── Built-in Listeners ─────────────────────────────────────────────

// Analytics logger
eventBus.on("*" as any, async (event: GameEvent) => {
  try {
    await db.insert(analyticsEventsTable).values({
      eventType: event.type,
      userId: event.userId || null,
      payload: {
        matchId: event.matchId,
        teamId: event.teamId,
        data: event.data,
      },
    }).catch(() => {});
  } catch {}
});

// XP listener
eventBus.on("ANSWER_CORRECT", async (event: GameEvent) => {
  if (!event.userId || !event.data) return;
  const { xpAmount, questionDifficulty } = event.data as any;
  if (!xpAmount) return;

  try {
    await db.insert(xpLogTable).values({
      userId: event.userId,
      action: "correct_answer",
      amount: xpAmount,
    });

    await getPool().query(
      `UPDATE user_stats
       SET xp = xp + $1, level = GREATEST(1, floor((xp + $1) / 500) + 1)
       WHERE user_id = $2`,
      [xpAmount, event.userId]
    );
  } catch {}
});

// Streak listener
eventBus.on("ANSWER_INCORRECT", async (event: GameEvent) => {
  if (!event.userId) return;
  try {
    await getPool().query(
      `UPDATE user_stats SET streak = 0 WHERE user_id = $1`,
      [event.userId]
    );
  } catch {}
});

// Match finished → update stats
eventBus.on("MATCH_ENDED", async (event: GameEvent) => {
  if (!event.matchId) return;
  const data = event.data as any;
  if (!data?.teams) return;

  for (const team of data.teams) {
    if (!team.userId) continue;
    try {
      const isWinner = team.id === data.winnerTeamId;
      const xpReward = isWinner ? 50 : 10;
      await getPool().query(
        `UPDATE user_stats
         SET total_games = total_games + 1,
             wins = wins + $1,
             losses = losses + $2,
             xp = xp + $3
         WHERE user_id = $4`,
        [isWinner ? 1 : 0, isWinner ? 0 : 1, xpReward, team.userId]
      );
    } catch {}
  }
});

export default eventBus;
