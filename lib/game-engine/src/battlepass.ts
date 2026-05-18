import { getPool } from "@workspace/db";
import { eventBus } from "./events.js";
import { checkAchievements } from "./achievements.js";

export async function awardBattlePassXp(userId: number, amount: number, source: string = "gameplay"): Promise<void> {
  if (!userId || amount <= 0) return;
  try {
    const pool = getPool();

    let bp = await pool.query(
      `SELECT id, current_level, current_xp, is_premium FROM user_battle_pass WHERE user_id = $1`,
      [userId]
    );

    let bpId: number;
    let currentLevel: number;
    let currentXp: number;
    let isPremium: boolean;

    if (bp.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO user_battle_pass (user_id, current_level, current_xp, is_premium)
         VALUES ($1, 0, 0, false)
         RETURNING id, current_level, current_xp, is_premium`,
        [userId]
      );
      bpId = insert.rows[0].id;
      currentLevel = 0;
      currentXp = 0;
      isPremium = false;
    } else {
      bpId = bp.rows[0].id;
      currentLevel = bp.rows[0].current_level;
      currentXp = bp.rows[0].current_xp;
      isPremium = bp.rows[0].is_premium;
    }

    const maxLevel = 50;
    let newXp = currentXp + amount;
    let newLevel = currentLevel;

    while (newLevel < maxLevel) {
      const xpReq = (newLevel + 1) * 500;
      if (newXp >= xpReq) {
        newXp -= xpReq;
        newLevel++;
      } else {
        break;
      }
    }

    if (newLevel > maxLevel) newLevel = maxLevel;
    if (newXp > (newLevel < maxLevel ? (newLevel + 1) * 500 : 0)) {
      newXp = newLevel < maxLevel ? (newLevel + 1) * 500 : 0;
    }

    await pool.query(
      `UPDATE user_battle_pass SET current_level = $1, current_xp = $2 WHERE id = $3`,
      [newLevel, newXp, bpId]
    );

    if (newLevel > currentLevel) {
      eventBus.emitSync("LEVEL_UP", {
        userId,
        data: { previousLevel: currentLevel, newLevel, source: "battle_pass" },
      });

      eventBus.emitSync("XP_EARNED", {
        userId,
        data: { amount, source: `battle_pass_level_up_${newLevel}` },
      });

      await checkAchievements(userId, { battlePassLevel: newLevel });
    }

    eventBus.emitSync("XP_EARNED", {
      userId,
      data: { amount, source: `battle_pass_${source}` },
    });
  } catch (e) {
    console.error("[battlepass] award failed:", e);
  }
}
