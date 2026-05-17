import { Router } from "express";
import { db, getPool } from "@workspace/db";
import {
  usersTable,
  userStatsTable,
  sessionsTable,
  questionsTable,
  questionOptionsTable,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  adminLogsTable,
  bansTable,
  chaptersTable,
  storyNodesTable,
  storyChoicesTable,
  loreEntriesTable,
  shopItemsTable,
  battlePassTable,
  worldEventsTable,
  skillTreesTable,
  analyticsEventsTable,
  stageMatchesTable,
} from "@workspace/db";
import { authenticate, requirePermission, requireRole } from "../middleware/auth";
import { eq, sql, desc, and } from "drizzle-orm";

const router = Router();

(async () => {
  try {
    await getPool().query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'`);
  } catch {}
})();

router.post("/admin/migrate", async (_req, res) => {
  try {
    await getPool().query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'`);
    res.json({ success: true });
  } catch (e: any) {
    res.json({ success: false, error: e.message });
  }
});

router.use(authenticate);

function logAdmin(adminId: number, action: string, targetType?: string, targetId?: string, data?: any) {
  db.insert(adminLogsTable).values({ adminId, action, targetType, targetId, data }).catch(() => {});
}

// ─── Dashboard ───────────────────────────────────────────────────────────

router.get("/admin/dashboard", requirePermission("manage_analytics"), async (_req, res) => {
  const totalUsers = (await db.select({ count: sql<number>`count(*)` }).from(usersTable))[0]?.count || 0;
  const onlineNow = (await db.select({ count: sql<number>`count(*)` }).from(sessionsTable).where(sql`expires_at > now()`))[0]?.count || 0;
  const totalMatches = (await db.select({ count: sql<number>`count(*)` }).from(stageMatchesTable))[0]?.count || 0;
  const xpToday = (await db.select({ sum: sql<number>`coalesce(sum(amount),0)` }).from(sessionsTable).where(sql`created_at > now() - interval '24 hours'`))[0]?.sum || 0;
  const activeMatches = (await db.select({ count: sql<number>`count(*)` }).from(stageMatchesTable).where(sql`state->>'phase' != 'ended'`))[0]?.count || 0;
  const questionsCount = (await db.select({ count: sql<number>`count(*)` }).from(questionsTable))[0]?.count || 0;

  res.json({
    stats: { totalUsers, onlineNow, totalMatches, xpToday, activeMatches, questionsCount },
  });
});

// ─── Live Match Center ──────────────────────────────────────────────────

router.get("/admin/matches", requirePermission("manage_matches"), async (_req, res) => {
  const { rows } = await getPool().query(
    `SELECT match_id, host_id, room_code, state, created_at, updated_at FROM stage_matches ORDER BY updated_at DESC LIMIT 100`
  );
  res.json({ matches: rows });
});

router.get("/admin/matches/:id", requirePermission("manage_matches"), async (req, res) => {
  const { rows } = await getPool().query(`SELECT * FROM stage_matches WHERE match_id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  res.json(rows[0]);
});

router.post("/admin/matches/:id/pause", requirePermission("manage_matches"), async (req, res) => {
  const { rows } = await getPool().query(`SELECT state FROM stage_matches WHERE match_id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const state = rows[0].state;
  state.adminPaused = true;
  state.previousPhase = state.phase;
  state.phase = "paused";
  await getPool().query(`UPDATE stage_matches SET state = $1 WHERE match_id = $2`, [JSON.stringify(state), req.params.id]);
  logAdmin(req.user!.id, "ADMIN_PAUSED_MATCH", "match", req.params.id);
  res.json({ success: true });
});

router.post("/admin/matches/:id/resume", requirePermission("manage_matches"), async (req, res) => {
  const { rows } = await getPool().query(`SELECT state FROM stage_matches WHERE match_id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const state = rows[0].state;
  state.phase = state.previousPhase || "question";
  delete state.adminPaused;
  delete state.previousPhase;
  await getPool().query(`UPDATE stage_matches SET state = $1 WHERE match_id = $2`, [JSON.stringify(state), req.params.id]);
  logAdmin(req.user!.id, "ADMIN_RESUMED_MATCH", "match", req.params.id);
  res.json({ success: true });
});

router.post("/admin/matches/:id/end", requirePermission("manage_matches"), async (req, res) => {
  const { rows } = await getPool().query(`SELECT state FROM stage_matches WHERE match_id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const state = rows[0].state;
  state.phase = "ended";
  await getPool().query(`UPDATE stage_matches SET state = $1 WHERE match_id = $2`, [JSON.stringify(state), req.params.id]);
  logAdmin(req.user!.id, "ADMIN_ENDED_MATCH", "match", req.params.id);
  res.json({ success: true });
});

router.post("/admin/matches/:id/score", requirePermission("manage_matches"), async (req, res) => {
  const { teamId, score } = req.body;
  const { rows } = await getPool().query(`SELECT state FROM stage_matches WHERE match_id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const state = rows[0].state;
  const team = state.teams?.find((t: any) => t.id === teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  team.score = score;
  await getPool().query(`UPDATE stage_matches SET state = $1 WHERE match_id = $2`, [JSON.stringify(state), req.params.id]);
  logAdmin(req.user!.id, "ADMIN_EDITED_SCORE", "match", req.params.id, { teamId, score });
  res.json({ success: true });
});

router.post("/admin/matches/:id/kick-team", requirePermission("manage_matches"), async (req, res) => {
  const { teamId } = req.body;
  const { rows } = await getPool().query(`SELECT state FROM stage_matches WHERE match_id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const state = rows[0].state;
  state.teams = state.teams?.filter((t: any) => t.id !== teamId) || [];
  await getPool().query(`UPDATE stage_matches SET state = $1 WHERE match_id = $2`, [JSON.stringify(state), req.params.id]);
  logAdmin(req.user!.id, "ADMIN_KICKED_TEAM", "match", req.params.id, { teamId });
  res.json({ success: true });
});

router.post("/admin/matches/:id/force-next", requirePermission("manage_matches"), async (req, res) => {
  const { rows } = await getPool().query(`SELECT state FROM stage_matches WHERE match_id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const state = rows[0].state;
  state.currentQuestionIndex = (state.currentQuestionIndex || 0) + 1;
  state.phase = "question";
  state.buzzerTeamId = null;
  if (state.currentQuestionIndex >= (state.questions?.length || 0)) {
    state.phase = "ended";
  }
  await getPool().query(`UPDATE stage_matches SET state = $1 WHERE match_id = $2`, [JSON.stringify(state), req.params.id]);
  logAdmin(req.user!.id, "ADMIN_FORCE_NEXT", "match", req.params.id);
  res.json({ success: true, questionIndex: state.currentQuestionIndex });
});

// ─── Question Management ────────────────────────────────────────────────

router.get("/admin/questions", requirePermission("manage_questions"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const category = req.query.category as string;

  const where = category ? sql`WHERE category = ${category}` : sql``;
  const total = (await getPool().query(`SELECT count(*) FROM questions ${where}`)).rows[0]?.count || 0;
  const { rows } = await getPool().query(
    `SELECT * FROM questions ${where} ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]
  );

  const questionsWithOptions = await Promise.all(rows.map(async (q: any) => {
    const opts = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return { ...q, options: opts };
  }));

  res.json({ questions: questionsWithOptions, total, page, limit });
});

router.get("/admin/questions/:id", requirePermission("manage_questions"), async (req, res) => {
  const [q] = await db.select().from(questionsTable).where(eq(questionsTable.id, parseInt(req.params.id))).limit(1);
  if (!q) return res.status(404).json({ error: "Question not found" });
  const opts = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
  res.json({ ...q, options: opts });
});

router.post("/admin/questions", requirePermission("manage_questions"), async (req, res) => {
  const { type, questionText, difficulty, category, correctAnswer, timeLimitSeconds, explanation, options } = req.body;
  if (!questionText || !options || options.length < 2) {
    return res.status(400).json({ error: "questionText and at least 2 options required" });
  }

  const [question] = await db.insert(questionsTable).values({
    type: type || "multiple_choice",
    questionText,
    difficulty: difficulty || 3,
    category: category || "general",
    correctAnswer,
    timeLimitSeconds: timeLimitSeconds || 30,
    explanation,
  }).returning();

  for (let i = 0; i < options.length; i++) {
    await db.insert(questionOptionsTable).values({
      questionId: question.id,
      optionText: options[i].text,
      isCorrect: options[i].isCorrect ? 1 : 0,
    });
  }

  logAdmin(req.user!.id, "ADMIN_CREATED_QUESTION", "question", String(question.id));
  res.status(201).json({ success: true, questionId: question.id });
});

router.put("/admin/questions/:id", requirePermission("manage_questions"), async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(questionsTable).where(eq(questionsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Question not found" });

  const { type, questionText, difficulty, category, correctAnswer, timeLimitSeconds, explanation } = req.body;
  await db.update(questionsTable).set({
    ...(type && { type }),
    ...(questionText && { questionText }),
    ...(difficulty && { difficulty }),
    ...(category && { category }),
    ...(correctAnswer && { correctAnswer }),
    ...(timeLimitSeconds && { timeLimitSeconds }),
    ...(explanation && { explanation }),
  }).where(eq(questionsTable.id, id));

  if (req.body.options) {
    await db.delete(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
    for (let i = 0; i < req.body.options.length; i++) {
      await db.insert(questionOptionsTable).values({
        questionId: id,
        optionText: req.body.options[i].text,
        isCorrect: req.body.options[i].isCorrect ? 1 : 0,
      });
    }
  }

  logAdmin(req.user!.id, "ADMIN_EDITED_QUESTION", "question", String(id));
  res.json({ success: true });
});

router.delete("/admin/questions/:id", requirePermission("manage_questions"), async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  logAdmin(req.user!.id, "ADMIN_DELETED_QUESTION", "question", String(id));
  res.json({ success: true });
});

router.post("/admin/questions/generate", requirePermission("manage_questions"), async (req, res) => {
  const { count, category, difficulty } = req.body;
  const sampleCount = Math.min(count || 5, 20);
  const where = [];
  if (category) where.push(sql`category = ${category}`);
  if (difficulty) where.push(sql`difficulty = ${difficulty}`);

  const { rows } = await getPool().query(
    `SELECT * FROM questions ${where.length > 0 ? `WHERE ${where.map(w => w.text).join(" AND ")}` : ""} ORDER BY RANDOM() LIMIT $1`,
    [sampleCount]
  );

  const questionsWithOptions = await Promise.all(rows.map(async (q: any) => {
    const opts = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return { ...q, options: opts };
  }));

  res.json({ questions: questionsWithOptions });
});

// ─── User Management ────────────────────────────────────────────────────

router.get("/admin/users", requirePermission("manage_users"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search as string;

  let where = sql`1=1`;
  if (search) where = sql`(username ILIKE ${"%" + search + "%"} OR email ILIKE ${"%" + search + "%"})`;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(where);
  const users = await db.select().from(usersTable).where(where).orderBy(desc(usersTable.id)).limit(limit).offset(offset);

  const usersWithStats = await Promise.all(users.map(async (u) => {
    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, u.id)).limit(1);
    const [ban] = await db.select().from(bansTable).where(and(
      eq(bansTable.userId, u.id),
      sql`(expires_at IS NULL OR expires_at > now())`
    )).limit(1);
    return { ...u, stats, banned: !!ban, banReason: ban?.reason, banExpiresAt: ban?.expiresAt };
  }));

  res.json({ users: usersWithStats, total: Number(count), page, limit });
});

router.get("/admin/users/:id", requirePermission("manage_users"), async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id))).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.userId, user.id)).orderBy(desc(sessionsTable.createdAt)).limit(10);
  const [ban] = await db.select().from(bansTable).where(and(
    eq(bansTable.userId, user.id),
    sql`(expires_at IS NULL OR expires_at > now())`
  )).limit(1);
  res.json({ ...user, stats, sessions, ban });
});

router.post("/admin/users/:id/ban", requirePermission("manage_users"), async (req, res) => {
  const userId = parseInt(req.params.id);
  const { reason, expiresInHours } = req.body;

  await db.insert(bansTable).values({
    userId,
    reason: reason || "No reason provided",
    bannedBy: req.user!.id,
    expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : undefined,
  });

  await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
  logAdmin(req.user!.id, "ADMIN_BANNED_USER", "user", String(userId), { reason, expiresInHours });
  res.json({ success: true });
});

router.post("/admin/users/:id/unban", requirePermission("manage_users"), async (req, res) => {
  const userId = parseInt(req.params.id);
  await db.delete(bansTable).where(eq(bansTable.userId, userId));
  logAdmin(req.user!.id, "ADMIN_UNBANNED_USER", "user", String(userId));
  res.json({ success: true });
});

router.post("/admin/users/:id/role", requirePermission("manage_users"), async (req, res) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: "Role required" });

  await db.update(usersTable).set({ role }).where(eq(usersTable.id, userId));
  logAdmin(req.user!.id, "ADMIN_CHANGED_ROLE", "user", String(userId), { role });
  res.json({ success: true });
});

router.post("/admin/users/:id/reset-xp", requirePermission("manage_users"), async (req, res) => {
  const userId = parseInt(req.params.id);
  await db.update(userStatsTable).set({ xp: 0, level: 1 }).where(eq(userStatsTable.userId, userId));
  logAdmin(req.user!.id, "ADMIN_RESET_XP", "user", String(userId));
  res.json({ success: true });
});

router.post("/admin/users/:id/give-coins", requirePermission("manage_users"), async (req, res) => {
  const userId = parseInt(req.params.id);
  const { amount } = req.body;
  if (!amount || amount < 0) return res.status(400).json({ error: "Valid amount required" });

  await db.update(userStatsTable).set({
    coins: sql`coins + ${amount}`,
  }).where(eq(userStatsTable.userId, userId));

  logAdmin(req.user!.id, "ADMIN_GAVE_COINS", "user", String(userId), { amount });
  res.json({ success: true });
});

// ─── Story Management ───────────────────────────────────────────────────

router.get("/admin/story/chapters", requirePermission("manage_story"), async (_req, res) => {
  const chapters = await db.select().from(chaptersTable).orderBy(chaptersTable.orderIndex);
  res.json({ chapters });
});

router.post("/admin/story/chapters", requirePermission("manage_story"), async (req, res) => {
  const { title, description, orderIndex, unlockLevel, coverImageUrl } = req.body;
  const [chapter] = await db.insert(chaptersTable).values({
    title, description, orderIndex, unlockLevel, coverImageUrl,
  }).returning();
  logAdmin(req.user!.id, "ADMIN_CREATED_CHAPTER", "story", String(chapter.id));
  res.status(201).json(chapter);
});

router.put("/admin/story/chapters/:id", requirePermission("manage_story"), async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, orderIndex, unlockLevel, coverImageUrl } = req.body;
  await db.update(chaptersTable).set({
    ...(title && { title }),
    ...(description && { description }),
    ...(orderIndex && { orderIndex }),
    ...(unlockLevel && { unlockLevel }),
    ...(coverImageUrl && { coverImageUrl }),
  }).where(eq(chaptersTable.id, id));
  logAdmin(req.user!.id, "ADMIN_EDITED_CHAPTER", "story", String(id));
  res.json({ success: true });
});

router.delete("/admin/story/chapters/:id", requirePermission("manage_story"), async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(chaptersTable).where(eq(chaptersTable.id, id));
  await db.delete(storyNodesTable).where(eq(storyNodesTable.chapterId, id));
  logAdmin(req.user!.id, "ADMIN_DELETED_CHAPTER", "story", String(id));
  res.json({ success: true });
});

router.get("/admin/story/nodes", requirePermission("manage_story"), async (req, res) => {
  const chapterId = req.query.chapterId ? parseInt(req.query.chapterId as string) : undefined;
  const where = chapterId ? eq(storyNodesTable.chapterId, chapterId) : undefined;
  const nodes = await db.select().from(storyNodesTable).where(where).orderBy(storyNodesTable.orderIndex);
  res.json({ nodes });
});

router.get("/admin/story/lore", requirePermission("manage_story"), async (_req, res) => {
  const lore = await db.select().from(loreEntriesTable).orderBy(desc(loreEntriesTable.createdAt));
  res.json({ lore });
});

// ─── Shop Management ────────────────────────────────────────────────────

router.get("/admin/shop/items", requirePermission("manage_shop"), async (_req, res) => {
  const items = await db.select().from(shopItemsTable).orderBy(desc(shopItemsTable.createdAt));
  res.json({ items });
});

router.post("/admin/shop/items", requirePermission("manage_shop"), async (req, res) => {
  const { name, description, type, priceCoins, pricePremium, rarity, iconUrl, isLimited } = req.body;
  const [item] = await db.insert(shopItemsTable).values({
    name, description, type, priceCoins, pricePremium, rarity, iconUrl, isLimited,
  }).returning();
  logAdmin(req.user!.id, "ADMIN_CREATED_SHOP_ITEM", "shop", String(item.id));
  res.status(201).json(item);
});

router.put("/admin/shop/items/:id", requirePermission("manage_shop"), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, type, priceCoins, pricePremium, rarity, iconUrl, isLimited, availableUntil } = req.body;
  await db.update(shopItemsTable).set({
    ...(name && { name }), ...(description && { description }), ...(type && { type }),
    ...(priceCoins !== undefined && { priceCoins }), ...(pricePremium !== undefined && { pricePremium }),
    ...(rarity && { rarity }), ...(iconUrl && { iconUrl }),
    ...(isLimited !== undefined && { isLimited }), ...(availableUntil && { availableUntil }),
  }).where(eq(shopItemsTable.id, id));
  logAdmin(req.user!.id, "ADMIN_EDITED_SHOP_ITEM", "shop", String(id));
  res.json({ success: true });
});

router.delete("/admin/shop/items/:id", requirePermission("manage_shop"), async (req, res) => {
  await db.delete(shopItemsTable).where(eq(shopItemsTable.id, parseInt(req.params.id)));
  logAdmin(req.user!.id, "ADMIN_DELETED_SHOP_ITEM", "shop", req.params.id);
  res.json({ success: true });
});

// ─── Battle Pass Management ─────────────────────────────────────────────

router.get("/admin/battle-pass", requirePermission("manage_battlepass"), async (_req, res) => {
  const bp = await db.select().from(battlePassTable).orderBy(battlePassTable.level);
  res.json({ battlePass: bp });
});

router.post("/admin/battle-pass", requirePermission("manage_battlepass"), async (req, res) => {
  const { seasonId, name, level, xpRequired, freeReward, premiumReward } = req.body;
  const [entry] = await db.insert(battlePassTable).values({ seasonId, name, level, xpRequired, freeReward, premiumReward }).returning();
  logAdmin(req.user!.id, "ADMIN_CREATED_BATTLE_PASS", "battlepass", String(entry.id));
  res.status(201).json(entry);
});

// ─── Prestige ──────────────────────────────────────────────────────────

router.get("/admin/prestige", requirePermission("manage_matches"), async (_req, res) => {
  const { rows } = await getPool().query(
    `SELECT u.id, u.username, us.prestige_level, us.xp, us.level
     FROM users u JOIN user_stats us ON u.id = us.user_id
     WHERE us.prestige_level > 0 ORDER BY us.prestige_level DESC LIMIT 100`
  );
  res.json({ prestigeUsers: rows });
});

// ─── Skill Tree Management ──────────────────────────────────────────────

router.get("/admin/skills", requirePermission("manage_skills"), async (_req, res) => {
  const skills = await db.select().from(skillTreesTable).orderBy(skillTreesTable.branch, skillTreesTable.level);
  res.json({ skills });
});

// ─── World Events Management ────────────────────────────────────────────

router.get("/admin/events", requirePermission("manage_events"), async (_req, res) => {
  const events = await db.select().from(worldEventsTable).orderBy(desc(worldEventsTable.createdAt));
  res.json({ events });
});

router.post("/admin/events", requirePermission("manage_events"), async (req, res) => {
  const { title, description, type, status, startAt, endAt, conditions, rewards, narrative } = req.body;
  const [event] = await db.insert(worldEventsTable).values({
    title, description, type, status: status || "upcoming",
    startAt, endAt, conditions, rewards, narrative,
  }).returning();
  logAdmin(req.user!.id, "ADMIN_CREATED_EVENT", "event", String(event.id));
  res.status(201).json(event);
});

// ─── Analytics ─────────────────────────────────────────────────────────

router.get("/admin/analytics", requirePermission("manage_analytics"), async (_req, res) => {
  const { rows: dailyUsers } = await getPool().query(
    `SELECT date_trunc('day', created_at) as day, count(*) as registrations
     FROM users WHERE created_at > now() - interval '30 days'
     GROUP BY day ORDER BY day`
  );
  const { rows: eventCounts } = await getPool().query(
    `SELECT event_type, count(*) as count FROM analytics_events
     WHERE created_at > now() - interval '7 days'
     GROUP BY event_type ORDER BY count DESC LIMIT 20`
  );
  const { rows: categoryStats } = await getPool().query(
    `SELECT category, count(*) as total,
     sum(CASE WHEN correct THEN 1 ELSE 0 END) as correct
     FROM answer_logs WHERE created_at > now() - interval '30 days'
     GROUP BY category`
  );
  const { rows: hourlyActivity } = await getPool().query(
    `SELECT extract(hour from created_at) as hour, count(*) as actions
     FROM analytics_events WHERE created_at > now() - interval '7 days'
     GROUP BY hour ORDER BY hour`
  );

  res.json({
    dailyUsers, eventCounts, categoryStats, hourlyActivity,
  });
});

// ─── Admin Logs ────────────────────────────────────────────────────────

router.get("/admin/logs", requirePermission("manage_analytics"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const { rows } = await getPool().query(
    `SELECT l.*, u.username as admin_name
     FROM admin_logs l LEFT JOIN users u ON l.admin_id = u.id
     ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]
  );
  const [{ count }] = await getPool().query(`SELECT count(*) FROM admin_logs`);

  res.json({ logs: rows, total: Number(count), page, limit });
});

// ─── Seed Default Roles & Permissions ──────────────────────────────────

router.post("/admin/seed/defaults", async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // Ensure tables exist
  try {
    await getPool().query(`CREATE TABLE IF NOT EXISTS roles (id SERIAL PRIMARY KEY, name TEXT UNIQUE, description TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS permissions (id SERIAL PRIMARY KEY, key TEXT UNIQUE, description TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS role_permissions (id SERIAL PRIMARY KEY, role_id INTEGER REFERENCES roles(id), permission_id INTEGER REFERENCES permissions(id))`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, admin_id INTEGER NOT NULL, action TEXT NOT NULL, target_type TEXT, target_id TEXT, data JSONB, ip TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS bans (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), reason TEXT, banned_by INTEGER REFERENCES users(id), expires_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create tables", detail: e.message });
    return;
  }

  const allPermissions = [
    "manage_users", "manage_matches", "manage_questions", "manage_story",
    "manage_shop", "manage_events", "manage_analytics", "manage_rankings",
    "manage_teams", "manage_battlepass", "manage_skills", "manage_modules",
    "manage_seasons", "manage_settings",
  ];

  for (const key of allPermissions) {
    await db.insert(permissionsTable).values({ key }).onConflictDoNothing();
  }

  const roles = [
    { name: "player", permissions: [] },
    { name: "moderator", permissions: ["manage_matches", "manage_teams"] },
    { name: "content_manager", permissions: ["manage_questions", "manage_story"] },
    { name: "analyst", permissions: ["manage_analytics"] },
    { name: "admin", permissions: allPermissions.filter(p => p !== "manage_settings") },
    { name: "super_admin", permissions: allPermissions },
  ];

  for (const role of roles) {
    const [inserted] = await db.insert(rolesTable).values({ name: role.name }).onConflictDoNothing().returning();
    if (!inserted) continue;
    for (const permKey of role.permissions) {
      const [perm] = await db.select().from(permissionsTable).where(eq(permissionsTable.key, permKey)).limit(1);
      if (perm) {
        await db.insert(rolePermissionsTable).values({ roleId: inserted.id, permissionId: perm.id }).onConflictDoNothing();
      }
    }
  }

  // Migrate users table to add role column if missing
  try {
    await getPool().query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'`);
  } catch {}

  try { logAdmin(req.user!.id, "ADMIN_SEEDED_DEFAULTS", "system", "seed"); } catch {}
  res.json({ success: true, permissionsCreated: allPermissions.length, rolesCreated: roles.length });
});

// ─── Settings (placeholder) ────────────────────────────────────────────

router.get("/admin/settings", requirePermission("manage_settings"), async (_req, res) => {
  const { rows } = await getPool().query(`SELECT * FROM world_state ORDER BY key`);
  res.json({ settings: rows });
});

router.post("/admin/settings", requirePermission("manage_settings"), async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: "Key required" });
  await getPool().query(
    `INSERT INTO world_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, JSON.stringify(value)]
  );
  logAdmin(req.user!.id, "ADMIN_UPDATED_SETTINGS", "settings", key, { value });
  res.json({ success: true });
});

export default router;
