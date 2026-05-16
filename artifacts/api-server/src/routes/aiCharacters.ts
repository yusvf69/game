import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, aiPlayerProfilesTable, userStatsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const CHARACTERS = [
  {
    id: 1,
    name: "Director Vale",
    title: "Archive Director",
    personality: "Commanding, mysterious, always several steps ahead. Speaks in measured, deliberate tones.",
    backstory: "Vale has led The Archive since its founding in 2031. No one knows their real name or face.",
    avatarUrl: null,
    greeting: "Agent. I've been expecting you. The Archive has need of your particular talents.",
  },
  {
    id: 2,
    name: "Analyst Korr",
    title: "Senior Intelligence Analyst",
    personality: "Brilliant, sarcastic, impatient with incompetence. Speaks quickly, thinks faster.",
    backstory: "Korr was recruited from a black-budget NSA program. Known for breaking unbreakable ciphers.",
    avatarUrl: null,
    greeting: "Good, you're here. Try to keep up — I don't like repeating myself.",
  },
  {
    id: 3,
    name: "The Whisper",
    title: "Unknown Entity",
    personality: "Cryptic, omniscient, possibly not human. Communicates in riddles and fragments.",
    backstory: "A presence detected in the Archive network. Origin unknown. Intentions unknown. It reached out first.",
    avatarUrl: null,
    greeting: "You hear the signal. Good. The frequencies have chosen you.",
  },
];

router.get("/ai/characters", async (req, res) => {
  res.json(CHARACTERS);
});

router.get("/ai/characters/:characterId", async (req, res) => {
  const id = parseInt(req.params.characterId);
  const character = CHARACTERS.find(c => c.id === id);
  if (!character) { res.status(404).json({ error: "Character not found" }); return; }
  res.json(character);
});

router.post("/ai/characters/:characterId/interact", async (req, res) => {
  const characterId = parseInt(req.params.characterId);
  const user = await getUserFromToken(req.headers.authorization);
  const { message } = req.body;

  const character = CHARACTERS.find(c => c.id === characterId);
  if (!character) { res.status(404).json({ error: "Character not found" }); return; }

  let playerLevel = 1;
  let playerName = "Agent";
  if (user) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
    playerName = u?.username || "Agent";
    playerLevel = stats?.level || 1;
  }

  const moodDescriptors = ["thoughtful", "stern", "curious", "urgent", "calm"];
  const mood = moodDescriptors[Math.floor(Math.random() * moodDescriptors.length)];

  const responseTemplates: Record<string, string[]> = {
    "Director Vale": [
      `"An interesting observation, ${playerName}. Most agents miss that detail. Your clearance is noted."`,
      `"The situation is more complex than it appears. Level ${playerLevel} clearance grants you access to the next tier of intel."`,
      `"I've been watching your progress. The Council is impressed. Don't let it go to your head."`,
      `"There are forces at work that even The Archive doesn't fully understand. You may be our best asset."`,
      `"Your analysis is correct. Proceed with caution — we only have one shot at this."`,
    ],
    "Analyst Korr": [
      `"Finally, someone who doesn't need everything explained twice. ${message ? 'Your query shows promise.' : 'Stay sharp.'}"`,
      `"I've been running decoys for three days. The signal keeps shifting. Level ${playerLevel} clearance might help."`,
      `"Look, I don't have time for pleasantries. The data doesn't lie, but people do. Remember that."`,
      `"You're catching on faster than most. ${playerName}, right? I'll remember that."`,
      `"This case is unlike anything I've seen. The patterns don't match any known threat."`,
    ],
    "The Whisper": [
      `"The signal... it recognizes you, ${playerName}. As it recognized the others before they vanished."`,
      `"Level ${playerLevel} is a threshold. Beyond it lies knowledge that changes the knower."`,
      `"They told you The Archive was founded in 2031. They were wrong. It was always here."`,
      `"Every answer you find creates three new questions. The hunt is the point, ${playerName}."`,
      `"I have seen the end of this path. Do you truly wish to proceed?"`,
    ],
  };

  const charResponses = responseTemplates[character.name] || responseTemplates["Director Vale"];
  const response = charResponses[Math.floor(Math.random() * charResponses.length)];

  res.json({
    characterId,
    characterName: character.name,
    title: character.title,
    mood,
    response,
    playerName,
    timestamp: new Date().toISOString(),
  });
});

export default router;
