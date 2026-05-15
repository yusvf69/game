import { Router } from "express";
import { db } from "@workspace/db";
import { friendsTable, usersTable, sessionsTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

router.get("/social/friends", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const friendships = await db.select().from(friendsTable).where(
    or(eq(friendsTable.userId, user.id), eq(friendsTable.friendId, user.id))
  );

  const result = await Promise.all(friendships.map(async (f) => {
    const friendId = f.userId === user.id ? f.friendId : f.userId;
    const [friend] = await db.select().from(usersTable).where(eq(usersTable.id, friendId)).limit(1);
    return {
      userId: friendId,
      username: friend?.username || "Unknown",
      avatarUrl: friend?.avatarUrl || null,
      status: f.status,
      isOnline: false,
    };
  }));

  res.json(result);
});

router.post("/social/friends/request", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { targetUsername } = req.body;
  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, targetUsername)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  await db.insert(friendsTable).values({ userId: user.id, friendId: target.id, status: "pending" }).onConflictDoNothing();
  res.json({ success: true });
});

export default router;
