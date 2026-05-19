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
  teamOperationsTable,
  teamMembersTable,
  teamMatchesTable,
  teamMatchScoresTable,
} from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { authenticate, requirePermission, requireRole } from "../middleware/auth";
import { eq, sql, desc, and } from "drizzle-orm";
import { configureOpenAI, generateQuestionsWithAI } from "@workspace/game-engine";

// Configure OpenAI if API key is available
const OPENAI_KEY = process.env["OPENAI_API_KEY"];
if (OPENAI_KEY) {
  configureOpenAI({ apiKey: OPENAI_KEY, model: "gpt-4o-mini" });
  console.log("[admin] OpenAI configured for question generation");
}

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

// ─── Bootstrap (first admin elevation, no permission required) ──────────

router.post("/admin/bootstrap", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    await getPool().query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS roles (id SERIAL PRIMARY KEY, name TEXT UNIQUE, description TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS permissions (id SERIAL PRIMARY KEY, key TEXT UNIQUE, description TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS role_permissions (id SERIAL PRIMARY KEY, role_id INTEGER REFERENCES roles(id), permission_id INTEGER REFERENCES permissions(id))`);

    const allPermissions = ["manage_users","manage_matches","manage_questions","manage_story","manage_shop","manage_events","manage_analytics","manage_rankings","manage_teams","manage_battlepass","manage_skills","manage_modules","manage_seasons","manage_settings"];
    for (const key of allPermissions) {
      await getPool().query(`INSERT INTO permissions (key) VALUES ($1) ON CONFLICT (key) DO NOTHING`, [key]);
    }

    const permRows = (await getPool().query(`SELECT id, key FROM permissions`)).rows;

    for (const r of [{ name: "super_admin", perms: allPermissions }, { name: "admin", perms: allPermissions.filter(p => p !== "manage_settings") }]) {
      const { rows: [roleRow] } = await getPool().query(`INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [r.name]);
      for (const permKey of r.perms) {
        const perm = permRows.find((p: any) => p.key === permKey);
        if (perm) {
          await getPool().query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [roleRow.id, perm.id]);
        }
      }
    }

    await getPool().query(`UPDATE users SET role = 'super_admin' WHERE id = $1`, [req.user.id]);
    res.json({ success: true, message: "User elevated to super_admin" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Dashboard ───────────────────────────────────────────────────────────

router.get("/admin/dashboard", requirePermission("manage_analytics"), async (_req, res) => {
  const totalUsers = (await db.select({ count: sql<number>`count(*)` }).from(usersTable))[0]?.count || 0;
  const onlineNow = (await db.select({ count: sql<number>`count(*)` }).from(sessionsTable).where(sql`expires_at > now()`))[0]?.count || 0;
  const totalMatches = (await db.select({ count: sql<number>`count(*)` }).from(stageMatchesTable))[0]?.count || 0;
  let xpToday = 0;
  try {
    const { rows } = await getPool().query(`SELECT coalesce(sum(amount),0) as sum FROM xp_log WHERE created_at > now() - interval '24 hours'`);
    xpToday = Number(rows[0]?.sum || 0);
  } catch {}
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

  const where = category ? eq(questionsTable.category, category) : undefined;
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(questionsTable).where(where);
  const questions = await db.select().from(questionsTable).where(where).orderBy(desc(questionsTable.id)).limit(limit).offset(offset);

  const questionsWithOptions = await Promise.all(questions.map(async (q: any) => {
    const opts = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return { ...q, options: opts };
  }));

  res.json({ questions: questionsWithOptions, total: Number(count), page, limit });
});

router.get("/admin/questions/:id", requirePermission("manage_questions"), async (req, res) => {
  const [q] = await db.select().from(questionsTable).where(eq(questionsTable.id, parseInt(req.params.id))).limit(1);
  if (!q) return res.status(404).json({ error: "Question not found" });
  const opts = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
  res.json({ ...q, options: opts });
});

function validateQuestionBody(body: any): string | null {
  const { type, questionText, correctAnswer } = body;
  if (!questionText) return "questionText is required";

  switch (type) {
    case "true_false":
      if (!correctAnswer || !["true", "false"].includes(correctAnswer.toLowerCase()))
        return "correctAnswer must be 'true' or 'false' for true_false questions";
      break;
    case "cipher":
      if (!correctAnswer) return "correctAnswer is required for cipher questions";
      break;
    case "image":
    case "audio":
    case "video":
      if (!body.mediaUrl) return "mediaUrl is required for media questions";
      break;
    case "multi_answer":
      if (!body.options || body.options.length < 2)
        return "At least 2 options required for multi_answer questions";
      if (!body.options.some((o: any) => o.isCorrect))
        return "At least one option must be marked correct";
      break;
    case "multiple_choice":
    case "text":
    default:
      if (!body.options || body.options.length < 2)
        return "At least 2 options required";
      if (!body.options.some((o: any) => o.isCorrect))
        return "One option must be marked correct";
      break;
  }
  return null;
}

router.post("/admin/questions", requirePermission("manage_questions"), async (req, res) => {
  try {
    const { type, questionText, difficulty, category, correctAnswer, timeLimitSeconds, explanation, options, mediaUrl } = req.body;

    const validationErr = validateQuestionBody(req.body);
    if (validationErr) return res.status(400).json({ error: validationErr });

    if (!category) {
      return res.status(400).json({ error: "Category is required. Select a category from the dropdown." });
    }
    const [existingCat] = await db.select().from(categoriesTable).where(eq(categoriesTable.name, category)).limit(1);
    if (!existingCat) return res.status(400).json({ error: `Category "${category}" does not exist. Add it in the Categories panel first.` });

    const qType = type || "multiple_choice";
    let resolvedOptions = options || [];

    if (qType === "true_false") {
      const isCorrect = correctAnswer?.toLowerCase() === "true";
      resolvedOptions = [
        { text: "True", isCorrect },
        { text: "False", isCorrect: !isCorrect },
      ];
    }

    const [question] = await db.insert(questionsTable).values({
      type: qType,
      questionText,
      difficulty: difficulty || 3,
      category: category || "general",
      correctAnswer: correctAnswer || "",
      timeLimitSeconds: timeLimitSeconds || 30,
      explanation: explanation || "",
      mediaUrl: mediaUrl || null,
    }).returning();

    for (let i = 0; i < resolvedOptions.length; i++) {
      await db.insert(questionOptionsTable).values({
        questionId: question.id,
        optionText: resolvedOptions[i].text,
        isCorrect: resolvedOptions[i].isCorrect ? 1 : 0,
      });
    }

    logAdmin(req.user!.id, "ADMIN_CREATED_QUESTION", "question", String(question.id));
    res.status(201).json({ success: true, questionId: question.id });
  } catch (e: any) {
    console.error("[admin] create question error:", e?.message || e);
    res.status(500).json({ error: "Failed to create question: " + (e?.message || "unknown") });
  }
});

router.put("/admin/questions/:id", requirePermission("manage_questions"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(questionsTable).where(eq(questionsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Question not found" });

    const body = req.body;

    if (body.type || body.questionText || body.correctAnswer || body.mediaUrl || body.options) {
      const validationErr = validateQuestionBody(body);
      if (validationErr) return res.status(400).json({ error: validationErr });
    }

    if (body.category !== undefined) {
      const [existingCat] = await db.select().from(categoriesTable).where(eq(categoriesTable.name, body.category)).limit(1);
      if (!existingCat) return res.status(400).json({ error: `Category "${body.category}" does not exist. Add it in the Categories panel first.` });
    }

    const qType = body.type || existing.type;
    let resolvedOptions = body.options;

    if (qType === "true_false" && body.correctAnswer) {
      const isCorrect = body.correctAnswer.toLowerCase() === "true";
      resolvedOptions = [
        { text: "True", isCorrect },
        { text: "False", isCorrect: !isCorrect },
      ];
    }

    const updateData: Record<string, any> = {};
    if (body.type) updateData.type = body.type;
    if (body.questionText) updateData.questionText = body.questionText;
    if (body.difficulty) updateData.difficulty = body.difficulty;
    if (body.category) updateData.category = body.category;
    if (body.correctAnswer !== undefined) updateData.correctAnswer = body.correctAnswer;
    if (body.timeLimitSeconds) updateData.timeLimitSeconds = body.timeLimitSeconds;
    if (body.explanation !== undefined) updateData.explanation = body.explanation;
    if (body.mediaUrl !== undefined) updateData.mediaUrl = body.mediaUrl;

    if (Object.keys(updateData).length > 0) {
      await db.update(questionsTable).set(updateData).where(eq(questionsTable.id, id));
    }

    if (resolvedOptions) {
      await db.delete(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
      for (let i = 0; i < resolvedOptions.length; i++) {
        await db.insert(questionOptionsTable).values({
          questionId: id,
          optionText: resolvedOptions[i].text,
          isCorrect: resolvedOptions[i].isCorrect ? 1 : 0,
        });
      }
    }

    logAdmin(req.user!.id, "ADMIN_EDITED_QUESTION", "question", String(id));
    res.json({ success: true });
  } catch (e: any) {
    console.error("[admin] edit question error:", e?.message || e);
    res.status(500).json({ error: "Failed to update question: " + (e?.message || "unknown") });
  }
});

router.delete("/admin/questions/:id", requirePermission("manage_questions"), async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  logAdmin(req.user!.id, "ADMIN_DELETED_QUESTION", "question", String(id));
  res.json({ success: true });
});

// ─── Categories Management ─────────────────────────────────────────────

async function ensureCategoriesTable() {
  await getPool().query(`CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    domain TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/admin/categories", requirePermission("manage_questions"), async (_req, res) => {
  try {
    await ensureCategoriesTable();
    const allCats = await db.select().from(categoriesTable).orderBy(categoriesTable.domain, categoriesTable.name);
    res.json({ categories: allCats });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load categories: " + (e?.message || "unknown") });
  }
});

router.post("/admin/categories", requirePermission("manage_questions"), async (req, res) => {
  const { name, displayName, domain } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    await ensureCategoriesTable();
    const [cat] = await db.insert(categoriesTable).values({
      name,
      displayName: displayName || name,
      domain: domain || "",
    }).returning();
    logAdmin(req.user!.id, "ADMIN_CREATED_CATEGORY", "category", String(cat.id), { name, domain });
    res.status(201).json(cat);
  } catch (e: any) {
    if (e?.code === "23505" || e?.message?.includes?.("unique") || e?.message?.includes?.("duplicate")) {
      return res.status(409).json({ error: "Category already exists" });
    }
    res.status(500).json({ error: "Failed to create category: " + (e?.message || "unknown") });
  }
});

router.delete("/admin/categories/:id", requirePermission("manage_questions"), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await ensureCategoriesTable();
    const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Category not found" });
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    logAdmin(req.user!.id, "ADMIN_DELETED_CATEGORY", "category", String(id), { name: existing.name });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete category: " + (e?.message || "unknown") });
  }
});

router.post("/admin/questions/generate", requirePermission("manage_questions"), async (req, res) => {
  const { count, category, difficulty, useAI } = req.body;
  const sampleCount = Math.min(count || 5, 20);

  if (useAI !== false) {
    const generated = await generateQuestionsWithAI(sampleCount, category, difficulty);
    const inserted = [];
    for (const q of generated) {
      try {
        const [question] = await db.insert(questionsTable).values({
          type: q.type || "multiple_choice",
          questionText: q.questionText,
          difficulty: q.difficulty,
          category: q.category || category || "general",
          correctAnswer: q.correctAnswer,
          timeLimitSeconds: q.timeLimitSeconds || 30,
          explanation: q.explanation,
        }).returning();

        for (let i = 0; i < q.options.length; i++) {
          await db.insert(questionOptionsTable).values({
            questionId: question.id,
            optionText: q.options[i],
            isCorrect: i === q.correctIndex ? 1 : 0,
          });
        }
        inserted.push(question.id);
      } catch (e: any) {
        console.error("[admin] Failed to insert AI question:", e.message);
      }
    }
    logAdmin(req.user!.id, "ADMIN_AI_GENERATED_QUESTIONS", "question", null, { count: inserted.length, useAI: true });
    res.json({ success: true, questionsGenerated: inserted.length, method: "ai" });
    return;
  }

  // Fallback: pick random existing questions
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

  logAdmin(req.user!.id, "ADMIN_COPIED_QUESTIONS", "question", null, { count: questionsWithOptions.length });
  res.json({ questions: questionsWithOptions });
});

// ─── Import / Export Questions ──────────────────────────────────────────

router.get("/admin/questions/export", requirePermission("manage_questions"), async (req, res) => {
  const { rows } = await getPool().query(`SELECT * FROM questions ORDER BY id`);
  const questions = await Promise.all(rows.map(async (q: any) => {
    const opts = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, q.id));
    return { ...q, options: opts };
  }));
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="questions-export-${Date.now()}.json"`);
  res.json(questions);
});

router.post("/admin/questions/import", requirePermission("manage_questions"), async (req, res) => {
  const questions = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Expected array of questions" });
  }
  let imported = 0;
  for (const q of questions) {
    try {
      const [question] = await db.insert(questionsTable).values({
        type: q.type || "multiple_choice",
        questionText: q.questionText || q.question_text,
        difficulty: q.difficulty || 3,
        category: q.category || "general",
        correctAnswer: q.correctAnswer || q.correct_answer || "",
        timeLimitSeconds: q.timeLimitSeconds || q.time_limit_seconds || 30,
        explanation: q.explanation || "",
        mediaUrl: q.mediaUrl || q.media_url || null,
      }).returning();

      const opts = q.options || [];
      for (let i = 0; i < opts.length; i++) {
        await db.insert(questionOptionsTable).values({
          questionId: question.id,
          optionText: opts[i].text || opts[i].optionText || opts[i].option_text || "",
          isCorrect: opts[i].isCorrect || opts[i].is_correct ? 1 : 0,
        });
      }
      imported++;
    } catch (e: any) {
      console.error("[admin] Import question failed:", e.message);
    }
  }
  logAdmin(req.user!.id, "ADMIN_IMPORTED_QUESTIONS", "question", null, { imported });
  res.json({ success: true, imported });
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

router.post("/admin/story/nodes", requirePermission("manage_story"), async (req, res) => {
  const { chapterId, type, content, speakerName, mediaUrl, orderIndex } = req.body;
  if (!chapterId || !content) { res.status(400).json({ error: "chapterId and content required" }); return; }
  const [node] = await db.insert(storyNodesTable).values({
    chapterId, type: type || "dialogue", content, speakerName, mediaUrl, orderIndex: orderIndex || 0,
  }).returning();
  logAdmin(req.user!.id, "ADMIN_CREATED_STORY_NODE", "story", String(node.id));
  res.status(201).json(node);
});

router.put("/admin/story/nodes/:id", requirePermission("manage_story"), async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(storyNodesTable).where(eq(storyNodesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Node not found" });
  const { type, content, speakerName, mediaUrl, orderIndex } = req.body;
  await db.update(storyNodesTable).set({
    ...(type && { type }), ...(content && { content }),
    ...(speakerName !== undefined && { speakerName }),
    ...(mediaUrl !== undefined && { mediaUrl }),
    ...(orderIndex !== undefined && { orderIndex }),
  }).where(eq(storyNodesTable.id, id));
  logAdmin(req.user!.id, "ADMIN_EDITED_STORY_NODE", "story", String(id));
  res.json({ success: true });
});

router.delete("/admin/story/nodes/:id", requirePermission("manage_story"), async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(storyChoicesTable).where(eq(storyChoicesTable.nodeId, id));
  await db.delete(storyNodesTable).where(eq(storyNodesTable.id, id));
  logAdmin(req.user!.id, "ADMIN_DELETED_STORY_NODE", "story", String(id));
  res.json({ success: true });
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

// ─── Replay System ─────────────────────────────────────────────────────

router.get("/admin/replays", requirePermission("manage_matches"), async (_req, res) => {
  const { rows } = await getPool().query(
    `SELECT match_id, room_code, host_id, state, created_at, updated_at
     FROM stage_matches
     WHERE state->>'phase' = 'ended'
     ORDER BY updated_at DESC LIMIT 50`
  );
  const replays = rows.map((r: any) => ({
    matchId: r.match_id,
    roomCode: r.room_code,
    hostId: r.host_id,
    teamCount: r.state?.teams?.filter((t: any) => t.name).length || 0,
    totalQuestions: r.state?.totalQuestions || 0,
    phases: r.state?.log?.length || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  res.json({ replays });
});

router.get("/admin/replays/:matchId", requirePermission("manage_matches"), async (req, res) => {
  const { rows } = await getPool().query(`SELECT * FROM stage_matches WHERE match_id = $1`, [req.params.matchId]);
  if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
  const state = rows[0].state;
  const qs = (state.questions || []).map((q: any) => {
    const { correctOptionIds, ...rest } = q;
    return rest;
  });
  res.json({
    matchId: rows[0].match_id,
    roomCode: rows[0].room_code,
    teams: (state.teams || []).filter((t: any) => t.name),
    questions: qs,
    log: state.log || [],
    phase: state.phase,
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at,
  });
});

// ─── Analytics ─────────────────────────────────────────────────────────

router.get("/admin/analytics", requirePermission("manage_analytics"), async (_req, res) => {
  let dailyUsers: any[] = [];
  let eventCounts: any[] = [];
  let categoryStats: any[] = [];
  let hourlyActivity: any[] = [];

  try {
    const r = await getPool().query(`SELECT date_trunc('day', created_at) as day, count(*) as registrations FROM users WHERE created_at > now() - interval '30 days' GROUP BY day ORDER BY day`);
    dailyUsers = r.rows;
  } catch {}

  try {
    const r = await getPool().query(`SELECT event_type, count(*) as count FROM analytics_events WHERE created_at > now() - interval '7 days' GROUP BY event_type ORDER BY count DESC LIMIT 20`);
    eventCounts = r.rows;
  } catch {}

  try {
    const r = await getPool().query(`SELECT category, count(*) as total, sum(CASE WHEN correct THEN 1 ELSE 0 END) as correct FROM answer_logs WHERE created_at > now() - interval '30 days' GROUP BY category`);
    categoryStats = r.rows;
  } catch {}

  try {
    const r = await getPool().query(`SELECT extract(hour from created_at) as hour, count(*) as actions FROM analytics_events WHERE created_at > now() - interval '7 days' GROUP BY hour ORDER BY hour`);
    hourlyActivity = r.rows;
  } catch {}

  res.json({ dailyUsers, eventCounts, categoryStats, hourlyActivity });
});

// ─── Admin Logs ────────────────────────────────────────────────────────

router.get("/admin/logs", requirePermission("manage_analytics"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const actionFilter = req.query.action as string;
  const searchQuery = req.query.search as string;

  try {
    let where = "";
    const params: any[] = [];
    let paramIdx = 1;

    if (actionFilter) {
      where += ` WHERE l.action = $${paramIdx++}`;
      params.push(actionFilter);
    }
    if (searchQuery) {
      where += where ? " AND" : " WHERE";
      where += ` (l.action ILIKE $${paramIdx} OR l.target_type ILIKE $${paramIdx} OR l.target_id ILIKE $${paramIdx})`;
      params.push(`%${searchQuery}%`);
      paramIdx++;
    }

    const { rows } = await getPool().query(
      `SELECT l.*, u.username as admin_name FROM admin_logs l LEFT JOIN users u ON l.admin_id = u.id${where} ORDER BY l.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );
    const [{ count }] = await getPool().query(`SELECT count(*) FROM admin_logs${where}`, params);

    res.json({ logs: rows, total: Number(count), page, limit });
  } catch {
    res.json({ logs: [], total: 0, page, limit });
  }
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
    await getPool().query(`CREATE TABLE IF NOT EXISTS analytics_events (id SERIAL PRIMARY KEY, event_type TEXT NOT NULL, user_id INTEGER REFERENCES users(id), session_id TEXT, payload JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS user_inventory (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), item_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, equipped BOOLEAN NOT NULL DEFAULT false, purchased_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS user_battle_pass (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), battle_pass_id INTEGER, current_level INTEGER NOT NULL DEFAULT 0, current_xp INTEGER NOT NULL DEFAULT 0, is_premium BOOLEAN NOT NULL DEFAULT false, claimed_rewards JSONB DEFAULT '[]')`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS world_state (id SERIAL PRIMARY KEY, key TEXT UNIQUE NOT NULL, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS xp_log (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), action TEXT NOT NULL, amount INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS answer_logs (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), question_id INTEGER NOT NULL, category TEXT NOT NULL DEFAULT 'general', difficulty INTEGER NOT NULL DEFAULT 1, correct INTEGER NOT NULL DEFAULT 0, time_spent_ms INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS chapters (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, order_index INTEGER NOT NULL DEFAULT 0, unlock_level INTEGER NOT NULL DEFAULT 1, cover_image_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS story_nodes (id SERIAL PRIMARY KEY, chapter_id INTEGER NOT NULL REFERENCES chapters(id), type TEXT NOT NULL DEFAULT 'dialogue', content TEXT NOT NULL, speaker_name TEXT, media_url TEXT, order_index INTEGER NOT NULL DEFAULT 0)`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS story_choices (id SERIAL PRIMARY KEY, node_id INTEGER NOT NULL REFERENCES story_nodes(id), text TEXT NOT NULL, next_node_id INTEGER, consequence_flag TEXT)`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS player_progress (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE, current_chapter_id INTEGER NOT NULL DEFAULT 1, current_node_id INTEGER NOT NULL DEFAULT 1, reputation_score INTEGER NOT NULL DEFAULT 0, story_flags JSONB DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS lore_entries (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'world', is_secret BOOLEAN NOT NULL DEFAULT false, unlock_condition TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS user_lore_unlocks (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), lore_id INTEGER NOT NULL REFERENCES lore_entries(id), unlocked_at TIMESTAMPTZ DEFAULT NOW())`);
    await getPool().query(`CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
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

  // Seed built-in shop items so user_inventory FK constraint is satisfied
  const BUILTIN_SHOP_ITEMS = [
    { id: 1, name: "Neon Agent Tag", description: "Custom nameplate with neon glow effect", type: "cosmetic", priceCoins: 500, rarity: "rare" },
    { id: 2, name: "XP Boost x2", description: "Double XP for next 10 questions", type: "boost", priceCoins: 200, rarity: "common" },
    { id: 3, name: "Analyst Title", description: "Unlock the 'Analyst' title", type: "title", priceCoins: 1000, rarity: "rare" },
    { id: 4, name: "Holographic Theme", description: "Cyber hologram UI theme", type: "theme", priceCoins: 2000, rarity: "epic" },
    { id: 5, name: "Legendary Frame", description: "Legendary avatar border", type: "cosmetic", priceCoins: 5000, rarity: "legendary" },
    { id: 6, name: "Streak Shield", description: "Protect your streak from one break", type: "boost", priceCoins: 300, rarity: "common" },
    { id: 7, name: "Master Title", description: "Unlock the 'Master' title", type: "title", priceCoins: 5000, rarity: "epic" },
    { id: 8, name: "Neon Purple Theme", description: "Purple neon UI theme variant", type: "theme", priceCoins: 1500, rarity: "rare" },
  ];
  for (const si of BUILTIN_SHOP_ITEMS) {
    await db.insert(shopItemsTable).values({ ...si, pricePremium: 0 }).onConflictDoNothing();
  }

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

// ─── Team Management ────────────────────────────────────────────────

router.get("/admin/teams", requirePermission("manage_teams"), async (_req, res) => {
  const { rows } = await getPool().query(
    `SELECT t.*, u.username,
            (SELECT count(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count,
            (SELECT count(*) FROM team_match_scores tms WHERE tms.team_id = t.id) as match_count
     FROM team_operations t
     LEFT JOIN users u ON u.id = t.captain_id
     ORDER BY t.created_at DESC LIMIT 100`
  );
  res.json({ teams: rows });
});

router.get("/admin/teams/:id", requirePermission("manage_teams"), async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await getPool().query(`SELECT * FROM team_operations WHERE id = $1`, [id]);
  if (rows.length === 0) return res.status(404).json({ error: "Team not found" });
  const members = await getPool().query(
    `SELECT tm.*, u.username FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = $1`,
    [id]
  );
  const matches = await getPool().query(
    `SELECT tms.match_id, tms.score, tms.correct_answers, tm.status, tm.created_at
     FROM team_match_scores tms
     LEFT JOIN team_matches tm ON tm.id = tms.match_id
     WHERE tms.team_id = $1 ORDER BY tm.created_at DESC LIMIT 10`,
    [id]
  );
  res.json({ team: rows[0], members: members.rows, matches: matches.rows });
});

router.post("/admin/teams/:id/rename", requirePermission("manage_teams"), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  await getPool().query(`UPDATE team_operations SET name = $1 WHERE id = $2`, [name, id]);
  logAdmin(req.user!.id, "ADMIN_RENAMED_TEAM", "team", String(id), { name });
  res.json({ success: true });
});

router.post("/admin/teams/:id/transfer", requirePermission("manage_teams"), async (req, res) => {
  const id = parseInt(req.params.id);
  const { newLeaderUserId } = req.body;
  if (!newLeaderUserId) return res.status(400).json({ error: "newLeaderUserId required" });
  await getPool().query(
    `UPDATE team_operations SET captain_id = $1 WHERE id = $2`,
    [newLeaderUserId, id]
  );
  logAdmin(req.user!.id, "ADMIN_TRANSFERRED_TEAM", "team", String(id), { newLeaderUserId });
  res.json({ success: true });
});

router.delete("/admin/teams/:id", requirePermission("manage_teams"), async (req, res) => {
  const id = parseInt(req.params.id);
  await getPool().query(`DELETE FROM team_members WHERE team_id = $1`, [id]);
  await getPool().query(`DELETE FROM team_match_scores WHERE team_id = $1`, [id]);
  await getPool().query(`DELETE FROM team_operations WHERE id = $1`, [id]);
  logAdmin(req.user!.id, "ADMIN_DELETED_TEAM", "team", String(id));
  res.json({ success: true });
});

export default router;
