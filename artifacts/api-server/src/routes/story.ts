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
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

router.get("/story/chapters", async (req, res) => {
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
});

router.get("/story/chapters/:chapterId", async (req, res) => {
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
});

router.get("/story/progress", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  let [progress] = await db.select().from(playerProgressTable).where(eq(playerProgressTable.userId, user.id)).limit(1);
  if (!progress) {
    [progress] = await db.insert(playerProgressTable).values({ userId: user.id, currentChapterId: 1, currentNodeId: 1 }).returning();
  }

  res.json({
    userId: progress.userId,
    currentChapterId: progress.currentChapterId,
    currentNodeId: progress.currentNodeId,
    reputationScore: progress.reputationScore,
    flags: progress.storyFlags || {},
  });
});

router.post("/story/choose", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { nodeId, choiceId } = req.body;

  const [choice] = await db.select().from(storyChoicesTable).where(eq(storyChoicesTable.id, choiceId)).limit(1);
  if (!choice) { res.status(404).json({ error: "Choice not found" }); return; }

  const nextNodeId = choice.nextNodeId;
  if (nextNodeId) {
    await db.update(playerProgressTable).set({ currentNodeId: nextNodeId }).where(eq(playerProgressTable.userId, user.id));
  }

  const [nextNode] = await db.select().from(storyNodesTable).where(eq(storyNodesTable.id, nextNodeId || nodeId)).limit(1);
  if (!nextNode) { res.status(404).json({ error: "Next node not found" }); return; }

  const choices = await db.select().from(storyChoicesTable).where(eq(storyChoicesTable.nodeId, nextNode.id));

  res.json({
    id: nextNode.id,
    chapterId: nextNode.chapterId,
    type: nextNode.type,
    content: nextNode.content,
    speakerName: nextNode.speakerName,
    mediaUrl: nextNode.mediaUrl,
    choices: choices.map((c) => ({ id: c.id, text: c.text, consequenceFlag: c.consequenceFlag, nextNodeId: c.nextNodeId })),
  });
});

router.get("/story/lore", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  const allLore = await db.select().from(loreEntriesTable);

  let unlockedIds: number[] = [];
  if (user) {
    const unlocks = await db.select().from(userLoreUnlocksTable).where(eq(userLoreUnlocksTable.userId, user.id));
    unlockedIds = unlocks.map((u) => u.loreId);
  }

  res.json(allLore.map((entry) => {
    const unlock = unlockedIds.includes(entry.id);
    return {
      id: entry.id,
      title: entry.title,
      content: entry.isSecret && !unlock ? "CLASSIFIED — Complete story missions to unlock this entry." : entry.content,
      category: entry.category,
      isSecret: entry.isSecret,
      unlockedAt: unlock ? new Date().toISOString() : null,
    };
  }));
});

export default router;
