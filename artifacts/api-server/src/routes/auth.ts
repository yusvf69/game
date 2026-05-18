import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  userStatsTable,
  sessionsTable,
  playerProgressTable,
  aiPlayerProfilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "cipher_salt_2040").digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

async function createUserWithDefaults(userId: number) {
  await db.insert(userStatsTable).values({ userId }).onConflictDoNothing();
  await db.insert(playerProgressTable).values({ userId, currentChapterId: 1, currentNodeId: 1 }).onConflictDoNothing();
  await db.insert(aiPlayerProfilesTable).values({ userId }).onConflictDoNothing();
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { username, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    username,
    email,
    passwordHash: hashPassword(password),
    isGuest: false,
  }).returning();

  await createUserWithDefaults(user.id);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  logger.info({ userId: user.id }, "User registered");
  res.status(201).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/guest", async (req, res) => {
  try {
    const guestNum = Math.floor(Math.random() * 99999);
    const username = `Agent_${guestNum}`;

    const [user] = await db.insert(usersTable).values({
      username,
      isGuest: true,
    }).returning();

    await createUserWithDefaults(user.id);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: null,
        avatarUrl: null,
        isGuest: true,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message, stack: (e as Error).stack?.split("\n").slice(0, 3).join("\n") });
  }
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isGuest: user.isGuest,
    createdAt: user.createdAt,
  });
});

// Temporary: promote a user to admin (protected by setup key)
router.post("/auth/setup-admin", async (req, res) => {
  const { email, key } = req.body;
  if (key !== "worldweaver_admin_setup_2026") {
    res.status(403).json({ error: "Invalid setup key" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await db.update(usersTable).set({ role: "admin" } as any).where(eq(usersTable.id, user.id));
    res.json({ success: true, message: `${user.username} is now admin` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
