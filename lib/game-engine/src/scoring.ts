export const XP_PER_LEVEL = 500;
export const RANK_TIERS = [
  { min: 0, name: "Bronze" },
  { min: 500, name: "Silver" },
  { min: 1000, name: "Gold" },
  { min: 1500, name: "Platinum" },
  { min: 2000, name: "Diamond" },
  { min: 3000, name: "Master" },
  { min: 4000, name: "Legend" },
];

export function calcLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function getRankTier(rankPoints: number): string {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (rankPoints >= RANK_TIERS[i].min) return RANK_TIERS[i].name;
  }
  return "Bronze";
}

export interface ScoreInput {
  difficulty: number;
  timeSpentMs: number;
  streak: number;
  isRebuzz: boolean;
}

export interface ScoreResult {
  baseXp: number;
  speedBonus: number;
  streakBonus: number;
  totalXp: number;
  points: number;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const baseXp = 10 * input.difficulty;

  const speedBonus = input.timeSpentMs < 5000 ? 20 : input.timeSpentMs < 10000 ? 10 : 0;

  const newStreak = input.streak + 1;
  const streakBonus = newStreak >= 5 ? 15 : newStreak >= 3 ? 5 : 0;

  const rebuzzMultiplier = input.isRebuzz ? 0.5 : 1.0;

  const totalXp = Math.round((baseXp + speedBonus + streakBonus) * rebuzzMultiplier);

  const points = Math.round((100 + speedBonus + streakBonus) * rebuzzMultiplier);

  return { baseXp, speedBonus, streakBonus, totalXp, points };
}

export function calculateStageScore(
  isCorrect: boolean,
  timeSpentMs: number,
  streak: number,
  wrongAttempts: number,
): { pointsGained: number; streakBonus: number; speedBonus: number } {
  if (!isCorrect) return { pointsGained: 0, streakBonus: 0, speedBonus: 0 };

  const pointsMultiplier = wrongAttempts > 0 ? 0.5 : 1.0;
  const speedBonus = timeSpentMs < 5000 ? 25 : 15;
  const streakBonus = streak > 0 ? 50 : 0;
  const pointsGained = Math.round((100 + speedBonus + streakBonus) * pointsMultiplier);

  return { pointsGained, streakBonus, speedBonus };
}
