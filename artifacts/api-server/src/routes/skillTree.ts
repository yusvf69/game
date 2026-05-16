import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, userStatsTable, xpLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const BUILTIN_SKILL_TREE = [
  { id: 1, name: "Pattern Recognition", branch: "intelligence", description: "Identify patterns faster in complex data", maxLevel: 5, xpCost: 100, statBonus: { accuracy: 2 }, parentSkillId: null, icon: "🧠" },
  { id: 2, name: "Logic Amplifier", branch: "intelligence", description: "Enhanced deductive reasoning capabilities", maxLevel: 5, xpCost: 150, statBonus: { accuracy: 3 }, parentSkillId: 1, icon: "🔍" },
  { id: 3, name: "Memory Cache", branch: "intelligence", description: "Retain and recall information more effectively", maxLevel: 3, xpCost: 200, statBonus: { streak_bonus: 1 }, parentSkillId: 2, icon: "💾" },
  { id: 4, name: "Quick Reflex", branch: "speed", description: "Faster response time under pressure", maxLevel: 5, xpCost: 100, statBonus: { speed_bonus: 2 }, parentSkillId: null, icon: "⚡" },
  { id: 5, name: "Time Dilation", branch: "speed", description: "Perceive time slower in critical moments", maxLevel: 3, xpCost: 200, statBonus: { time_bonus: 5 }, parentSkillId: 4, icon: "⏱" },
  { id: 6, name: "Burst Processing", branch: "speed", description: "Process multiple inputs simultaneously", maxLevel: 4, xpCost: 150, statBonus: { multi_bonus: 1 }, parentSkillId: 5, icon: "💨" },
  { id: 7, name: "Social Engineer", branch: "social", description: "Better understand NPC motivations and secrets", maxLevel: 5, xpCost: 100, statBonus: { rep_bonus: 2 }, parentSkillId: null, icon: "🎭" },
  { id: 8, name: "Interrogator", branch: "social", description: "Extract more information from interactions", maxLevel: 3, xpCost: 150, statBonus: { intel_bonus: 1 }, parentSkillId: 7, icon: "🎯" },
  { id: 9, name: "Network Weaver", branch: "social", description: "Build connections that reveal hidden lore", maxLevel: 4, xpCost: 200, statBonus: { lore_bonus: 1 }, parentSkillId: 8, icon: "🕸" },
];

router.get("/skill-tree", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  let playerSkills: any[] = [];
  
  if (user) {
    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
    if (stats) {
      try {
        const raw = await db.execute(sql`SELECT * FROM player_skills WHERE user_id = ${user.id}`);
        playerSkills = raw.rows || [];
      } catch {}
    }
  }

  const tree = BUILTIN_SKILL_TREE.map(skill => {
    const ps = playerSkills.find((p: any) => p.skill_id === skill.id);
    return {
      ...skill,
      currentLevel: ps?.current_level || 0,
      unlocked: ps?.unlocked || false,
    };
  });

  res.json(tree);
});

router.post("/skill-tree/upgrade", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { skillId } = req.body;
  const skill = BUILTIN_SKILL_TREE.find(s => s.id === skillId);
  if (!skill) { res.status(404).json({ error: "Skill not found" }); return; }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
  if (!stats) { res.status(404).json({ error: "Stats not found" }); return; }

  let currentLevel = 0;
  try {
    const raw = await db.execute(sql`SELECT current_level FROM player_skills WHERE user_id = ${user.id} AND skill_id = ${skillId}`);
    if (raw.rows?.length > 0) {
      currentLevel = (raw.rows[0] as { current_level: number }).current_level;
    }
  } catch {}

  if (currentLevel >= skill.maxLevel) {
    res.status(400).json({ error: "Skill already at maximum level" });
    return;
  }

  const cost = skill.xpCost * (currentLevel + 1);
  if (stats.xp < cost) {
    res.status(400).json({ error: `Not enough XP. Required: ${cost}, Available: ${stats.xp}` });
    return;
  }

  if (skill.parentSkillId) {
    let parentLevel = 0;
    try {
      const parentRaw = await db.execute(sql`SELECT current_level FROM player_skills WHERE user_id = ${user.id} AND skill_id = ${skill.parentSkillId}`);
      if (parentRaw.rows?.length > 0) {
        parentLevel = (parentRaw.rows[0] as { current_level: number }).current_level;
      }
    } catch {}
    if (parentLevel < 1) {
      res.status(400).json({ error: `Parent skill "${BUILTIN_SKILL_TREE.find(s => s.id === skill.parentSkillId)?.name}" must be unlocked first` });
      return;
    }
  }

  const newLevel = currentLevel + 1;
  const newXp = stats.xp - cost;

  await db.update(userStatsTable).set({ xp: newXp }).where(eq(userStatsTable.userId, user.id));
  await db.insert(xpLogTable).values({ userId: user.id, action: `skill_upgrade_${skill.name.replace(/\s+/g, '_').toLowerCase()}`, amount: -cost });

  try {
    if (currentLevel === 0) {
      await db.execute(sql`INSERT INTO player_skills (user_id, skill_id, current_level, unlocked) VALUES (${user.id}, ${skillId}, 1, true)`);
    } else {
      await db.execute(sql`UPDATE player_skills SET current_level = ${newLevel} WHERE user_id = ${user.id} AND skill_id = ${skillId}`);
    }
  } catch {
    await db.execute(sql`INSERT INTO player_skills (user_id, skill_id, current_level, unlocked) VALUES (${user.id}, ${skillId}, 1, true) ON CONFLICT DO NOTHING`);
  }

  res.json({
    success: true,
    skillId,
    skillName: skill.name,
    newLevel,
    xpSpent: cost,
    remainingXp: newXp,
    statBonus: skill.statBonus,
  });
});

import { sql } from "drizzle-orm";

export default router;
