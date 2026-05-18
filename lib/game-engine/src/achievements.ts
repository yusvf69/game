import { db, getPool } from "@workspace/db";
import { achievementsTable, userAchievementsTable, userStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { eventBus } from "./events.js";

const RANK_ORDER = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Legend"];

function evaluateCondition(condition: string, stats: Record<string, any>, context: Record<string, unknown>): boolean {
  const totalGamesMatch = condition.match(/^total_games_(\d+)$/);
  if (totalGamesMatch) return stats.totalGames >= parseInt(totalGamesMatch[1]);

  const levelMatch = condition.match(/^level_(\d+)$/);
  if (levelMatch) return stats.level >= parseInt(levelMatch[1]);

  const streakMatch = condition.match(/^streak_(\d+)$/);
  if (streakMatch) return stats.streak >= parseInt(streakMatch[1]);

  if (condition === "speed_5s") {
    const answerTime = context.answerTimeMs;
    return typeof answerTime === "number" && answerTime < 5000;
  }

  if (condition === "rank_silver") return RANK_ORDER.indexOf(stats.rankTier) >= RANK_ORDER.indexOf("Silver");
  if (condition === "rank_legend") return RANK_ORDER.indexOf(stats.rankTier) >= RANK_ORDER.indexOf("Legend");

  const prestigeMatch = condition.match(/^prestige_(\d+)$/);
  if (prestigeMatch) return stats.prestigeLevel >= parseInt(prestigeMatch[1]);

  const pvpMatch = condition.match(/^pvp_wins_(\d+)$/);
  if (pvpMatch) return stats.wins >= parseInt(pvpMatch[1]);

  const chapterMatch = condition.match(/^chapter_(\d+)_complete$/);
  if (chapterMatch) {
    return (context.completedChapters as number[] | undefined)?.includes(parseInt(chapterMatch[1])) ?? false;
  }

  if (condition === "perfect_5") return stats.streak >= 5;

  if (condition === "speed_run") {
    const opTime = context.operationTimeMs;
    return typeof opTime === "number" && opTime < 30000;
  }

  const bpMatch = condition.match(/^battlepass_(\d+)$/);
  if (bpMatch) {
    return (context.battlePassLevel as number ?? 0) >= parseInt(bpMatch[1]);
  }

  const skillsMatch = condition.match(/^skills_(\d+)$/);
  if (skillsMatch) {
    return (context.skillCount as number ?? 0) >= parseInt(skillsMatch[1]);
  }

  const shopMatch = condition.match(/^shop_items_(\d+)$/);
  if (shopMatch) {
    return (context.shopPurchases as number ?? 0) >= parseInt(shopMatch[1]);
  }

  if (condition === "all_lore") return context.allLoreUnlocked === true;
  if (condition === "all_characters") return context.allCharactersMet === true;
  if (condition === "event_contribute") return context.eventContributed === true;

  if (condition === "tournament_win") {
    return (context.tournamentWins as number ?? 0) > 0;
  }

  return false;
}

export async function checkAchievements(userId: number, context: Record<string, unknown> = {}): Promise<void> {
  if (!userId) return;
  try {
    const allAchievements = await db.select().from(achievementsTable);
    if (!allAchievements.length) return;

    const unlocked = await db.select({ achievementId: userAchievementsTable.achievementId })
      .from(userAchievementsTable)
      .where(eq(userAchievementsTable.userId, userId));
    const unlockedIds = new Set(unlocked.map(u => u.achievementId));

    const stats = await db.select().from(userStatsTable)
      .where(eq(userStatsTable.userId, userId))
      .limit(1);
    const userStats = stats[0];
    if (!userStats) return;

    const userStatsRecord: Record<string, any> = {
      totalGames: userStats.totalGames,
      level: userStats.level,
      streak: userStats.streak,
      rankTier: userStats.rankTier,
      prestigeLevel: userStats.prestigeLevel,
      wins: userStats.wins,
    };

    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;
      if (!achievement.condition) continue;

      const met = evaluateCondition(achievement.condition, userStatsRecord, context);
      if (!met) continue;

      await db.insert(userAchievementsTable).values({
        userId,
        achievementId: achievement.id,
      });

      if (achievement.rewardXp > 0) {
        await getPool().query(
          `UPDATE user_stats SET xp = xp + $1 WHERE user_id = $2`,
          [achievement.rewardXp, userId]
        );
      }

      eventBus.emitSync("ACHIEVEMENT_UNLOCKED", {
        userId,
        data: {
          achievementId: achievement.id,
          name: achievement.name,
          rewardXp: achievement.rewardXp,
        },
      });

      eventBus.emitSync("XP_EARNED", {
        userId,
        data: { amount: achievement.rewardXp, source: "achievement", achievementId: achievement.id },
      });
    }
  } catch (e) {
    console.error("[achievements] check failed:", e);
  }
}
