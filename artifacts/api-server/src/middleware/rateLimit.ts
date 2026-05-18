import { Request, Response, NextFunction } from "express";
import { getPool } from "@workspace/db";

const CLEANUP_INTERVAL = 300_000;
let lastCleanup = 0;

async function cleanupOldEntries(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  try {
    const pool = getPool();
    await pool.query(`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '10 minutes'`);
  } catch {}
}

export function rateLimit(maxRequests: number, windowMs: number = 60_000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || req.socket.remoteAddress || "unknown"}:${req.path}`;
    const windowKey = Math.floor(Date.now() / windowMs);
    const compositeKey = `${key}:${windowKey}`;

    try {
      cleanupOldEntries();

      const pool = getPool();
      const result = await pool.query(
        `INSERT INTO rate_limits (bucket_key, count, window_start)
         VALUES ($1, 1, NOW())
         ON CONFLICT (bucket_key)
         DO UPDATE SET count = rate_limits.count + 1
         WHERE rate_limits.count < $2
         RETURNING count`,
        [compositeKey, maxRequests]
      );

      const count = result.rows[0]?.count;

      if (!count) {
        res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      next();
    } catch {
      next();
    }
  };
}

export async function logSuspiciousActivity(userId: number, action: string, details: any, severity: number = 1) {
  try {
    await getPool().query(
      `INSERT INTO anti_cheat_logs (user_id, action, details, severity, flagged)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, JSON.stringify(details), severity, severity >= 3 ? true : false]
    );
  } catch {}
}
