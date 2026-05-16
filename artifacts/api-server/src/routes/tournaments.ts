import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, userStatsTable } from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

router.get("/tournaments", async (req, res) => {
  let tournaments: any[] = [];
  try {
    const raw = await db.execute(sql`SELECT * FROM tournaments ORDER BY start_date DESC`);
    tournaments = raw.rows || [];
  } catch {}
  res.json(tournaments.map(t => ({
    id: t.id, name: t.name, description: t.description, type: t.type, status: t.status,
    maxParticipants: t.max_participants, minLevel: t.min_level, entryFee: t.entry_fee,
    rewardXp: t.reward_xp, rewardCoins: t.reward_coins, rewardItem: t.reward_item,
    startDate: t.start_date, endDate: t.end_date,
  })));
});

router.get("/tournaments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const raw = await db.execute(sql`SELECT * FROM tournaments WHERE id = ${id}`);
    if (!raw.rows?.length) { res.status(404).json({ error: "Not found" }); return; }
    const t = raw.rows[0];

    let participants: any[] = [];
    try {
      const pRaw = await db.execute(sql`SELECT tp.*, u.username FROM tournament_participants tp JOIN users u ON u.id = tp.user_id WHERE tp.tournament_id = ${id}`);
      participants = pRaw.rows || [];
    } catch {}

    let matches: any[] = [];
    try {
      const mRaw = await db.execute(sql`SELECT tm.*, u1.username as p1_name, u2.username as p2_name FROM tournament_matches tm LEFT JOIN users u1 ON u1.id = tm.player1_id LEFT JOIN users u2 ON u2.id = tm.player2_id WHERE tm.tournament_id = ${id} ORDER BY tm.round, tm.match_index`);
      matches = mRaw.rows || [];
    } catch {}

    res.json({
      id: t.id, name: t.name, description: t.description, type: t.type, status: t.status,
      maxParticipants: t.max_participants, minLevel: t.min_level, entryFee: t.entry_fee,
      rewardXp: t.reward_xp, rewardCoins: t.reward_coins, rewardItem: t.reward_item,
      startDate: t.start_date, endDate: t.end_date,
      participants: participants.map((p: any) => ({ userId: p.user_id, username: p.username, seed: p.seed, currentRound: p.current_round, isEliminated: p.is_eliminated, finalPosition: p.final_position })),
      matches: matches.map((m: any) => ({ id: m.id, round: m.round, matchIndex: m.match_index, player1Id: m.player1_id, player1Name: m.p1_name, player2Id: m.player2_id, player2Name: m.p2_name, winnerId: m.winner_id, status: m.status })),
    });
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/tournaments/:id/join", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = parseInt(req.params.id);
  try {
    const raw = await db.execute(sql`SELECT * FROM tournaments WHERE id = ${id}`);
    if (!raw.rows?.length) { res.status(404).json({ error: "Tournament not found" }); return; }
    const t = raw.rows[0] as { status: string; min_level: number; entry_fee: number };

    if (t.status !== "registration") { res.status(400).json({ error: "Tournament is not accepting registrations" }); return; }

    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
    if (!stats || stats.level < t.min_level) { res.status(400).json({ error: `Level ${t.min_level} required` }); return; }
    if (stats.coins < t.entry_fee) { res.status(400).json({ error: `Entry fee ${t.entry_fee} coins required` }); return; }

    await db.execute(sql`INSERT INTO tournament_participants (tournament_id, user_id, seed) VALUES (${id}, ${user.id}, ${Math.floor(Math.random() * 100)}) ON CONFLICT DO NOTHING`);
    if (t.entry_fee > 0) {
      await db.update(userStatsTable).set({ coins: stats.coins - t.entry_fee }).where(eq(userStatsTable.userId, user.id));
    }

    res.json({ success: true, message: "Joined tournament" });
  } catch { res.status(500).json({ error: "Server error" }); }
});

export default router;
