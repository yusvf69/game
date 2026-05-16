import { Router } from "express";
import { db } from "@workspace/db";
import {
  questionsTable,
  questionOptionsTable,
  tacticalModulesTable,
  userTacticalModulesTable,
  sessionsTable,
  usersTable,
  userStatsTable,
} from "@workspace/db";
import { eq, and, ne, sql } from "drizzle-orm";
import { getIO } from "../socket";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const MODULE_DEFS: Record<string, { id: string; name: string; description: string; energyCost: number; category: string; rarity: string; effect: string }> = {
  signal_trace: {
    id: "signal_trace", name: "Signal Trace",
    description: "Eliminates 2 wrong answers from the current question",
    energyCost: 1, category: "assist", rarity: "common",
    effect: "eliminate_wrong",
  },
  time_dilation: {
    id: "time_dilation", name: "Time Dilation",
    description: "+10 seconds to the mission timer",
    energyCost: 2, category: "time", rarity: "common",
    effect: "add_time",
  },
  archive_scan: {
    id: "archive_scan", name: "Archive Scan",
    description: "Reveals a contextual hint about the question",
    energyCost: 1, category: "hint", rarity: "common",
    effect: "reveal_hint",
  },
  ghost_protocol: {
    id: "ghost_protocol", name: "Ghost Protocol",
    description: "Protects your streak from being broken on the first mistake",
    energyCost: 3, category: "defense", rarity: "rare",
    effect: "protect_streak",
  },
  neural_boost: {
    id: "neural_boost", name: "Neural Boost",
    description: "+25% XP for this question. Lost if answer is wrong.",
    energyCost: 2, category: "xp", rarity: "uncommon",
    effect: "xp_boost",
  },
  threat_prediction: {
    id: "threat_prediction", name: "Threat Prediction",
    description: "Predicts the category of the next incoming question",
    energyCost: 1, category: "intel", rarity: "uncommon",
    effect: "predict_next",
  },
  memory_recall: {
    id: "memory_recall", name: "Memory Recall",
    description: "Displays a fragment from a similar past operation",
    energyCost: 2, category: "hint", rarity: "rare",
    effect: "show_similar",
  },
  overclock: {
    id: "overclock", name: "Overclock",
    description: "WARNING: Timer reduced by 40% but XP reward tripled",
    energyCost: 5, category: "risk", rarity: "epic",
    effect: "risk_reward",
  },
};

const HINTS: Record<string, string[]> = {
  cryptography: ["This cipher predates modern encryption.", "Look for patterns in how letters are transformed.", "The key is often hidden in plain sight."],
  history: ["This event changed the balance of power globally.", "The date itself carries meaning.", "Consider who benefited most from this outcome."],
  science: ["This principle was discovered by observing nature.", "Think about what cannot be created or destroyed.", "The answer lies in fundamental forces."],
  logic: ["Trace each premise to its conclusion.", "Eliminate impossibilities first.", "The shortest path is not always direct."],
  technology: ["This system was designed before security was a priority.", "The name reveals its purpose.", "Older protocols often have legacy vulnerabilities."],
  default: ["The Archive suggests: consider the question from a different angle.", "Cross-reference with known intelligence patterns.", "Sometimes the most obvious answer is correct."],
};

async function ensureUserModules(userId: number) {
  let [row] = await db.select().from(userTacticalModulesTable).where(eq(userTacticalModulesTable.userId, userId)).limit(1);
  if (!row) {
    const defaults: Record<string, number> = { signal_trace: 3, time_dilation: 2, archive_scan: 3, ghost_protocol: 1, neural_boost: 2, threat_prediction: 2, memory_recall: 1, overclock: 0 };
    [row] = await db.insert(userTacticalModulesTable).values({
      userId,
      tacticalEnergy: 10,
      maxEnergy: 10,
      modules: defaults as any,
    }).returning();
  }
  return row;
}

// GET /tactical/modules — returns all module defs + user's state
router.get("/tactical/modules", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.json({
      modules: Object.values(MODULE_DEFS).map((m) => ({
        id: m.id, name: m.name, description: m.description,
        energyCost: m.energyCost, category: m.category, rarity: m.rarity,
      })),
      owned: null,
      tacticalEnergy: 0,
      maxEnergy: 10,
    });
    return;
  }

  const utm = await ensureUserModules(user.id);
  const owned = utm.modules as Record<string, number>;

  // Regen energy over time (1 per 5 minutes, capped at max)
  const now = Date.now();
  const last = new Date(utm.lastEnergyRegen).getTime();
  const elapsed = now - last;
  const regenAmount = Math.floor(elapsed / (5 * 60 * 1000));
  if (regenAmount > 0 && utm.tacticalEnergy < utm.maxEnergy) {
    const newEnergy = Math.min(utm.maxEnergy, utm.tacticalEnergy + regenAmount);
    await db.update(userTacticalModulesTable).set({
      tacticalEnergy: newEnergy,
      lastEnergyRegen: new Date(),
    }).where(eq(userTacticalModulesTable.userId, user.id));
    utm.tacticalEnergy = newEnergy;
  }

  res.json({
    modules: Object.values(MODULE_DEFS).map((m) => ({
      id: m.id, name: m.name, description: m.description,
      energyCost: m.energyCost, category: m.category, rarity: m.rarity,
    })),
    owned,
    tacticalEnergy: utm.tacticalEnergy,
    maxEnergy: utm.maxEnergy,
  });
});

// POST /tactical/activate — activate a module for the current question
router.post("/tactical/activate", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { moduleId, questionId, questionCategory, questionTimeLimit } = req.body;
  const def = MODULE_DEFS[moduleId];
  if (!def) { res.status(400).json({ error: "Unknown module" }); return; }

  const utm = await ensureUserModules(user.id);
  const owned = utm.modules as Record<string, number>;

  if ((owned[moduleId] || 0) < 1) { res.status(400).json({ error: "Module not owned" }); return; }
  if (utm.tacticalEnergy < def.energyCost) { res.status(400).json({ error: "Insufficient tactical energy" }); return; }

  // Deduct energy + module
  const newQty = (owned[moduleId] || 0) - 1;
  const newModules = { ...owned, [moduleId]: newQty };
  const newEnergy = utm.tacticalEnergy - def.energyCost;
  await db.update(userTacticalModulesTable).set({
    modules: newModules as any,
    tacticalEnergy: newEnergy,
  }).where(eq(userTacticalModulesTable.userId, user.id));

  // Build effect payload based on module type
  let effectData: any = { type: def.effect, moduleId };

  switch (def.effect) {
    case "eliminate_wrong": {
      const options = await db.select({ id: questionOptionsTable.id, isCorrect: questionOptionsTable.isCorrect })
        .from(questionOptionsTable).where(eq(questionOptionsTable.questionId, questionId));
      const wrongOptions = options.filter((o) => !o.isCorrect);
      const eliminated = wrongOptions.slice(0, 2).map((o) => o.id);
      effectData.eliminatedOptionIds = eliminated;
      break;
    }
    case "add_time": {
      effectData.extraSeconds = 10;
      break;
    }
    case "reveal_hint": {
      const [q] = await db.select({ category: questionsTable.category })
        .from(questionsTable).where(eq(questionsTable.id, questionId)).limit(1);
      const hintPool = HINTS[q?.category as string] || HINTS.default;
      effectData.hint = hintPool[Math.floor(Math.random() * hintPool.length)];
      effectData.questionCategory = q?.category || "unknown";
      break;
    }
    case "protect_streak": {
      effectData.streakProtected = true;
      break;
    }
    case "xp_boost": {
      effectData.multiplier = 1.25;
      effectData.riskNote = "Bonus XP is forfeit if answer is incorrect.";
      break;
    }
    case "predict_next": {
      const [nextQ] = await db.select({ category: questionsTable.category })
        .from(questionsTable).where(ne(questionsTable.id, questionId)).limit(1);
      effectData.predictedCategory = nextQ?.category || "unknown";
      effectData.confidence = Math.floor(Math.random() * 20 + 70) + "%";
      break;
    }
    case "show_similar": {
      const [q] = await db.select({ category: questionsTable.category })
        .from(questionsTable).where(eq(questionsTable.id, questionId)).limit(1);
      if (q) {
        const [similar] = await db.select({ questionText: questionsTable.questionText })
          .from(questionsTable)
          .where(and(eq(questionsTable.category, q.category), ne(questionsTable.id, questionId)))
          .limit(1);
        effectData.similarQuestion = similar?.questionText || "No similar intel in Archive.";
      }
      break;
    }
    case "risk_reward": {
      effectData.timerMultiplier = 0.6;
      effectData.xpMultiplier = 3.0;
      effectData.warning = "SYSTEM INSTABILITY DETECTED. TIMER COMPRESSED.";
      break;
    }
  }

  // Emit director message about module activation
  try {
    const io = getIO();
    io.to(`user:${user.id}`).emit("director:message", {
      text: `[TACTICAL SYSTEMS]: ${def.name} deployed. Energy at ${newEnergy}/${utm.maxEnergy}.`,
    });
  } catch {}

  res.json({ success: true, effect: effectData, energyRemaining: newEnergy });
});

// POST /tactical/purchase — buy a module or energy with coins
router.post("/tactical/purchase", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { type, moduleId } = req.body;
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (!stats) { res.status(400).json({ error: "Stats not found" }); return; }

  const utm = await ensureUserModules(user.id);
  const owned = utm.modules as Record<string, number>;

  if (type === "energy") {
    const cost = 50;
    if ((stats.coins || 0) < cost) { res.status(400).json({ error: "Insufficient coins" }); return; }
    const newEnergy = Math.min(utm.maxEnergy, utm.tacticalEnergy + 5);
    const regenEnergy = newEnergy - utm.tacticalEnergy;
    await db.update(userStatsTable).set({ coins: (stats.coins || 0) - cost }).where(eq(userStatsTable.userId, user.id));
    await db.update(userTacticalModulesTable).set({ tacticalEnergy: newEnergy }).where(eq(userTacticalModulesTable.userId, user.id));
    res.json({ success: true, tacticalEnergy: newEnergy, coinsSpent: cost, energyGained: regenEnergy });
    return;
  }

  if (type === "module" && moduleId) {
    const modId: string = String(moduleId);
    const prices: Record<string, number> = {
      signal_trace: 30, time_dilation: 50, archive_scan: 30,
      ghost_protocol: 150, neural_boost: 80, threat_prediction: 60,
      memory_recall: 120, overclock: 300,
    };
    const cost = prices[modId];
    if (!cost) { res.status(400).json({ error: "Invalid module" }); return; }
    if ((stats.coins || 0) < cost) { res.status(400).json({ error: "Insufficient coins" }); return; }

    const modOwned = owned as unknown as Record<string, number>;
    const newModules = { ...modOwned, [modId]: (modOwned[modId] || 0) + 1 };
    await db.update(userStatsTable).set({ coins: (stats.coins || 0) - cost }).where(eq(userStatsTable.userId, user.id));
    await db.update(userTacticalModulesTable).set({ modules: newModules as any }).where(eq(userTacticalModulesTable.userId, user.id));

    res.json({ success: true, moduleId: modId, quantity: newModules[modId], coinsSpent: cost });
    return;
  }

  res.status(400).json({ error: "Invalid purchase type" });
});

export { MODULE_DEFS };
export default router;
