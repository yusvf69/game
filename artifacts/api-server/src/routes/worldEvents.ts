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

const BUILTIN_EVENTS = [
  {
    id: 1, title: "The Signal Intensifies", description: "A mysterious signal is growing stronger. All Archive agents are needed to trace its origin. Contribute correct answers to help decode the transmission.", type: "global", status: "active",
    conditions: { requiredContributions: 1000 }, rewards: { xp: 200, coins: 100, lore: "The Signal Origin" },
  },
  {
    id: 2, title: "Data Leak at Sector 7", description: "Classified data is being leaked. Answer questions accurately to identify the breach source before critical intel is compromised.", type: "global", status: "active",
    conditions: { requiredContributions: 500 }, rewards: { xp: 150, coins: 50, title: "Data Guardian" },
  },
  {
    id: 3, title: "The Rogue Agent", description: "A former Archive agent has turned. Track their digital footprint through intelligence assessments. Every correct answer reveals more of their location.", type: "narrative", status: "upcoming",
    conditions: { requiredContributions: 2000 }, rewards: { xp: 500, coins: 300, item: "Rogue Dossier" },
  },
];

router.get("/world-events", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);

  let events = BUILTIN_EVENTS;
  let myContributions: any[] = [];

  if (user) {
    try {
      const raw = await db.execute(sql`SELECT event_id, contribution FROM world_event_participants WHERE user_id = ${user.id}`);
      myContributions = (raw.rows || []).map((r: any) => ({ eventId: r.event_id, contribution: r.contribution }));
    } catch {}
  }

  let totalContributions: Record<number, number> = {};
  try {
    const totals = await db.execute(sql`SELECT event_id, SUM(contribution) as total FROM world_event_participants GROUP BY event_id`);
    for (const row of (totals.rows || [])) {
      totalContributions[(row as any).event_id] = parseInt((row as any).total) || 0;
    }
  } catch {}

  res.json(events.map(e => {
    const myC = myContributions.find(c => c.eventId === e.id);
    return {
      ...e,
      myContribution: myC?.contribution || 0,
      totalContribution: totalContributions[e.id] || 0,
      progress: e.conditions.requiredContributions > 0 ? Math.min(100, ((totalContributions[e.id] || 0) / e.conditions.requiredContributions) * 100) : 0,
    };
  }));
});

router.post("/world-events/:id/contribute", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const eventId = parseInt(req.params.id);
  const event = BUILTIN_EVENTS.find(e => e.id === eventId);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const { amount = 1 } = req.body;

  try {
    const existing = await db.execute(sql`SELECT id, contribution FROM world_event_participants WHERE user_id = ${user.id} AND event_id = ${eventId}`);
    if (existing.rows?.length) {
      await db.execute(sql`UPDATE world_event_participants SET contribution = contribution + ${amount} WHERE user_id = ${user.id} AND event_id = ${eventId}`);
    } else {
      await db.execute(sql`INSERT INTO world_event_participants (event_id, user_id, contribution) VALUES (${eventId}, ${user.id}, ${amount})`);
    }
  } catch {}

  res.json({ success: true, eventId, contributed: amount });
});

router.post("/world-events/:id/claim", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const eventId = parseInt(req.params.id);
  const event = BUILTIN_EVENTS.find(e => e.id === eventId);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  try {
    await db.execute(sql`UPDATE world_event_participants SET rewards_claimed = true WHERE user_id = ${user.id} AND event_id = ${eventId}`);
  } catch {}

  res.json({ success: true, rewards: event.rewards });
});

export default router;
