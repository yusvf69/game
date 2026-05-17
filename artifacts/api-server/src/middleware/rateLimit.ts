import { Request, Response, NextFunction } from "express";
import { getPool } from "@workspace/db";

interface RateEntry {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, RateEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart > 120_000) buckets.delete(key);
  }
}

export function rateLimit(maxRequests: number, windowMs: number = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    cleanup();

    const key = `${req.ip || req.socket.remoteAddress || "unknown"}:${req.path}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests", retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000) });
      return;
    }

    entry.count++;
    next();
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
