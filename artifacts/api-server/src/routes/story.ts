import { Router } from "express";
import { db } from "@workspace/db";
import {
  chaptersTable,
  storyNodesTable,
  storyChoicesTable,
  playerProgressTable,
  loreEntriesTable,
  userLoreUnlocksTable,
  sessionsTable,
  usersTable,
  userStatsTable,
  xpLogTable,
  aiPlayerProfilesTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { getIO } from "../socket";

const router = Router();

const XP_PER_LEVEL = 500;

function calcLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const bearerToken = token.replace("Bearer ", "");
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
    if (!session || session.expiresAt < new Date()) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    return user || null;
  } catch { return null; }
}

async function awardXp(userId: number, action: string, amount: number): Promise<{ xpGained: number; newLevel: number; leveledUp: boolean }> {
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, userId)).limit(1);
  if (!stats) return { xpGained: 0, newLevel: 1, leveledUp: false };
  const newXp = stats.xp + amount;
  const newLevel = calcLevel(newXp);
  const leveledUp = newLevel > stats.level;
  await db.update(userStatsTable).set({ xp: newXp, level: newLevel }).where(eq(userStatsTable.userId, userId));
  await db.insert(xpLogTable).values({ userId, action, amount });
  return { xpGained: amount, newLevel, leveledUp };
}

async function checkLoreUnlocks(userId: number, flags: Record<string, boolean>) {
  const allLore = await db.select().from(loreEntriesTable).where(eq(loreEntriesTable.isSecret, true));
  const existingUnlocks = await db.select().from(userLoreUnlocksTable).where(eq(userLoreUnlocksTable.userId, userId));
  const unlockedIds = new Set(existingUnlocks.map((u) => u.loreId));
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, userId)).limit(1);

  for (const entry of allLore) {
    if (unlockedIds.has(entry.id)) continue;
    if (!entry.unlockCondition) continue;

    let shouldUnlock = false;
    if (entry.unlockCondition.startsWith("flag:")) {
      const flagName = entry.unlockCondition.replace("flag:", "");
      shouldUnlock = flags[flagName] === true;
    } else if (entry.unlockCondition.startsWith("level:")) {
      const lvl = parseInt(entry.unlockCondition.replace("level:", ""));
      shouldUnlock = (stats?.level || 1) >= lvl;
    }

    if (shouldUnlock) {
      await db.insert(userLoreUnlocksTable).values({ userId, loreId: entry.id });
    }
  }
}

async function getFlags(userId: number): Promise<Record<string, boolean>> {
  const [progress] = await db.select().from(playerProgressTable).where(eq(playerProgressTable.userId, userId)).limit(1);
  return (progress?.storyFlags as Record<string, boolean>) || {};
}

router.get("/story/chapters", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    const chapters = await db.select().from(chaptersTable).orderBy(asc(chaptersTable.orderIndex));

    let userLevel = 1;
    if (user) {
      const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
      userLevel = stats?.level || 1;
    }

    res.json(chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      description: ch.description,
      orderIndex: ch.orderIndex,
      unlockLevel: ch.unlockLevel,
      isUnlocked: userLevel >= ch.unlockLevel,
      coverImageUrl: ch.coverImageUrl,
    })));
  } catch { res.status(500).json({ error: "Failed to fetch chapters" }); }
});

router.get("/story/chapters/:chapterId", async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const user = await getUserFromToken(req.headers.authorization);

    const [chapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.id, chapterId)).limit(1);
    if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }

    let userLevel = 1;
    if (user) {
      const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
      userLevel = stats?.level || 1;
    }

    const nodes = await db.select().from(storyNodesTable)
      .where(eq(storyNodesTable.chapterId, chapterId))
      .orderBy(asc(storyNodesTable.orderIndex));

    const nodesWithChoices = await Promise.all(nodes.map(async (node) => {
      const choices = await db.select().from(storyChoicesTable).where(eq(storyChoicesTable.nodeId, node.id));
      return {
        id: node.id,
        chapterId: node.chapterId,
        type: node.type,
        content: node.content,
        speakerName: node.speakerName,
        mediaUrl: node.mediaUrl,
        choices: choices.map((c) => ({ id: c.id, text: c.text, consequenceFlag: c.consequenceFlag, nextNodeId: c.nextNodeId })),
      };
    }));

    res.json({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      orderIndex: chapter.orderIndex,
      unlockLevel: chapter.unlockLevel,
      isUnlocked: userLevel >= chapter.unlockLevel,
      coverImageUrl: chapter.coverImageUrl,
      nodes: nodesWithChoices,
    });
  } catch { res.status(500).json({ error: "Failed to fetch chapter" }); }
});

router.get("/story/progress", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

    let [progress] = await db.select().from(playerProgressTable).where(eq(playerProgressTable.userId, user.id)).limit(1);
    if (!progress) {
      [progress] = await db.insert(playerProgressTable).values({ userId: user.id, currentChapterId: 1, currentNodeId: 1 }).returning();
    }

    const chapters = await db.select().from(chaptersTable).orderBy(asc(chaptersTable.orderIndex));
    let chapterComplete = false;
    if (progress.currentChapterId) {
      const nodes = await db.select({ id: storyNodesTable.id }).from(storyNodesTable)
        .where(eq(storyNodesTable.chapterId, progress.currentChapterId))
        .orderBy(asc(storyNodesTable.orderIndex));
      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1];
        const lastChoices = await db.select().from(storyChoicesTable).where(eq(storyChoicesTable.nodeId, lastNode.id));
        chapterComplete = progress.currentNodeId === lastNode.id && lastChoices.length === 0;
      }
    }

    res.json({
      userId: progress.userId,
      currentChapterId: progress.currentChapterId,
      currentNodeId: progress.currentNodeId,
      reputationScore: progress.reputationScore,
      flags: progress.storyFlags || {},
      chapterComplete,
    });
  } catch { res.status(500).json({ error: "Failed to fetch progress" }); }
});

router.post("/story/choose", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { nodeId, choiceId } = req.body;

    const [choice] = await db.select().from(storyChoicesTable).where(eq(storyChoicesTable.id, choiceId)).limit(1);
    if (!choice) { res.status(404).json({ error: "Choice not found" }); return; }

    const nextNodeId = choice.nextNodeId;

    const [progress] = await db.select().from(playerProgressTable).where(eq(playerProgressTable.userId, user.id)).limit(1);
    let currentFlags: Record<string, boolean> = (progress?.storyFlags as Record<string, boolean>) || {};
    let currentRep = progress?.reputationScore || 0;

    if (choice.consequenceFlag) {
      currentFlags[choice.consequenceFlag] = true;
    }

    let repChange = 0;
    if (choice.consequenceFlag?.includes("trust") || choice.consequenceFlag?.includes("cooperate")) repChange = 5;
    else if (choice.consequenceFlag?.includes("suspicious") || choice.consequenceFlag?.includes("defy")) repChange = -3;
    else if (choice.consequenceFlag?.includes("diplomatic")) repChange = 3;
    currentRep = Math.max(-100, Math.min(100, currentRep + repChange));

    let targetChapterId = progress?.currentChapterId || 1;
    if (nextNodeId) {
      const [targetNode] = await db.select().from(storyNodesTable).where(eq(storyNodesTable.id, nextNodeId)).limit(1);
      if (targetNode) targetChapterId = targetNode.chapterId;
    }

    await db.update(playerProgressTable).set({
      currentNodeId: nextNodeId || nodeId,
      currentChapterId: targetChapterId,
      storyFlags: currentFlags,
      reputationScore: currentRep,
    }).where(eq(playerProgressTable.userId, user.id));

    const finalNodeId = nextNodeId || nodeId;
    const [nextNode] = await db.select().from(storyNodesTable).where(eq(storyNodesTable.id, finalNodeId)).limit(1);
    if (!nextNode) { res.status(404).json({ error: "Next node not found" }); return; }

    const choices = await db.select().from(storyChoicesTable).where(eq(storyChoicesTable.nodeId, nextNode.id));

    const xpResult = await awardXp(user.id, "story_choice", 10);

    await checkLoreUnlocks(user.id, currentFlags);

    // AI Director: personality-based story flags
    const [aiProfile] = await db.select().from(aiPlayerProfilesTable).where(eq(aiPlayerProfilesTable.userId, user.id)).limit(1);
    if (aiProfile) {
      if (aiProfile.behaviorType === "strategic") currentFlags["profile_strategic"] = true;
      if (aiProfile.behaviorType === "explorer") currentFlags["profile_explorer"] = true;
      if (aiProfile.behaviorType === "learner") currentFlags["profile_learner"] = true;
      if ((aiProfile.riskIndex || 0) > 70) currentFlags["profile_high_risk"] = true;
      if ((aiProfile.loyaltyScore || 0) > 70) currentFlags["profile_loyal"] = true;
      if ((aiProfile.loyaltyScore || 0) < 30) currentFlags["profile_unstable"] = true;
      if ((aiProfile.tacticalIQ || 0) > 80) currentFlags["profile_tactical_genius"] = true;

      // Update flags in DB
      await db.update(playerProgressTable).set({ storyFlags: currentFlags }).where(eq(playerProgressTable.userId, user.id));
    }

    let chapterComplete = false;
    let chapterXp = 0;
    if (nextNode.chapterId && choices.length === 0) {
      const nodes = await db.select({ id: storyNodesTable.id }).from(storyNodesTable)
        .where(eq(storyNodesTable.chapterId, nextNode.chapterId))
        .orderBy(asc(storyNodesTable.orderIndex));
      if (nodes.length > 0 && nodes[nodes.length - 1].id === nextNode.id) {
        chapterComplete = true;
        chapterXp = 50;
        const chXpResult = await awardXp(user.id, `chapter_${nextNode.chapterId}_complete`, chapterXp);

        const chapters = await db.select().from(chaptersTable).orderBy(asc(chaptersTable.orderIndex));
        const currentIdx = chapters.findIndex((c) => c.id === nextNode.chapterId);
        if (currentIdx >= 0 && currentIdx < chapters.length - 1) {
          const nextCh = chapters[currentIdx + 1];
          await db.update(playerProgressTable).set({
            currentChapterId: nextCh.id,
          }).where(eq(playerProgressTable.userId, user.id));
        }
      }
    }

    // Generate AI Director message based on choice
    let directorMessage: string | null = null;
    if (choice.consequenceFlag) {
      const directorContexts: Record<string, string[]> = {
        trust_vale: [
          "WE SAW YOU TRUST VALE. The Archive notes your capacity for faith.",
          "You extended trust to Vale. An interesting variable in your psychological profile.",
          "Trust is a vector. You opened that channel with Vale. Logged.",
        ],
        suspicious_vale: [
          "You doubted Vale. Prudent. The Archive values critical judgment.",
          "Suspicion is a survival mechanism. Your distrust is recorded.",
          "You questioned Vale's motives. This aligns with high-agency operators.",
        ],
        diplomatic_vale: [
          "Diplomatic resolution. You understand information warfare requires finesse.",
          "You chose diplomacy. The Archive respects measured responses.",
        ],
        cooperate_vale: [
          "Cooperation detected. You are building alliances. The network watches.",
          "You chose to cooperate. In this game, allies are both weapons and vulnerabilities.",
        ],
        defy_vale: [
          "Defiance. You resist external control. This will not be forgotten.",
          "You chose to defy. The Archive expects compliance. Your deviation is noted.",
        ],
      };

      const matchedKey = Object.keys(directorContexts).find((k) => choice.consequenceFlag?.includes(k));
      if (matchedKey) {
        const pool = directorContexts[matchedKey];
        directorMessage = `[AI DIRECTOR]: ${pool[Math.floor(Math.random() * pool.length)]}`;
      }
    }

    // Emit real-time director message via Socket.IO
    if (directorMessage) {
      try {
        getIO().to(`user:${user.id}`).emit("director:message", { text: directorMessage });
      } catch {}
    }

    res.json({
      id: nextNode.id,
      chapterId: nextNode.chapterId,
      type: nextNode.type,
      content: nextNode.content,
      speakerName: nextNode.speakerName,
      mediaUrl: nextNode.mediaUrl,
      choices: choices.map((c) => ({ id: c.id, text: c.text, consequenceFlag: c.consequenceFlag, nextNodeId: c.nextNodeId })),
      xpGained: xpResult.xpGained,
      newLevel: xpResult.leveledUp ? xpResult.newLevel : null,
      chapterComplete,
      chapterXp: chapterComplete ? chapterXp : 0,
      reputationScore: currentRep,
      directorMessage,
    });
  } catch { res.status(500).json({ error: "Failed to process choice" }); }
});

router.get("/story/lore", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    const allLore = await db.select().from(loreEntriesTable);

    let unlockedEntries: Array<{ loreId: number; unlockedAt: Date }> = [];
    if (user) {
      const unlocks = await db.select().from(userLoreUnlocksTable).where(eq(userLoreUnlocksTable.userId, user.id));
      unlockedEntries = unlocks.map((u) => ({ loreId: u.loreId, unlockedAt: u.unlockedAt }));
    }

    const unlockedMap = new Map(unlockedEntries.map((u) => [u.loreId, u.unlockedAt]));
    const flags = user ? await getFlags(user.id) : {};

    res.json(allLore.map((entry) => {
      const unlockDate = unlockedMap.get(entry.id);
      const isUnlocked = !!unlockDate;
      return {
        id: entry.id,
        title: entry.title,
        content: entry.isSecret && !isUnlocked ? "CLASSIFIED — Complete story missions to unlock this entry." : entry.content,
        category: entry.category,
        isSecret: entry.isSecret,
        unlockedAt: isUnlocked ? unlockDate.toISOString() : null,
        unlockCondition: entry.isSecret && !isUnlocked ? entry.unlockCondition : null,
      };
    }));
  } catch { res.status(500).json({ error: "Failed to fetch lore" }); }
});

export default router;
