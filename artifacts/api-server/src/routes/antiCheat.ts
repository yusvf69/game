import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const recentActions = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMITS: Record<string, number> = {
  "/questions": 10,
  "/answer": 5,
  "/auth/login": 3,
  "/story/choose": 10,
};

router.post("/anti-cheat/log", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  const { action, details } = req.body;

  try {
    await db.execute(sql`INSERT INTO anti_cheat_logs (user_id, action, details, severity) VALUES (${user?.id || 0}, ${action}, ${JSON.stringify(details || {})}, ${0})`);
  } catch {}

  res.json({ logged: true });
});

function checkRateLimit(userId: number, endpoint: string): boolean {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const limit = RATE_LIMITS[endpoint] || 30;

  const entry = recentActions.get(key);
  if (!entry || now - entry.windowStart > 60000) {
    recentActions.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export { checkRateLimit };
export default router;
