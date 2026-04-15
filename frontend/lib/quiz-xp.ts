// XP calculation utilities for the gamified quiz system

const XP_PER_CORRECT = 20;
const COMBO_THRESHOLD = 3;
const TIME_BONUS_INTERVAL = 5; // seconds
const TIME_BONUS_XP = 5;

interface QuestionResult {
  isCorrect: boolean;
  isBonus: boolean;
  bonusPoints: number | null;
  pointWeight: number;
  timeRemaining?: number; // seconds remaining when answer was selected
}

/**
 * Calculates XP earned for a single answer.
 */
export function calcQuestionXP(
  result: QuestionResult,
  comboCount: number
): number {
  if (!result.isCorrect) return 0;

  let xp = XP_PER_CORRECT * result.pointWeight;

  // Bonus question extra XP
  if (result.isBonus && result.bonusPoints) {
    xp += result.bonusPoints;
  }

  // Combo multiplier (x2 after 3+ consecutive correct)
  if (comboCount >= COMBO_THRESHOLD) {
    xp *= 2;
  }

  // Timer bonus
  if (result.timeRemaining && result.timeRemaining > 0) {
    const bonusIntervals = Math.floor(result.timeRemaining / TIME_BONUS_INTERVAL);
    xp += bonusIntervals * TIME_BONUS_XP;
  }

  return Math.round(xp);
}

/**
 * Calculates total XP for a completed quiz.
 */
export function calcQuizXP(results: QuestionResult[]): number {
  let totalXP = 0;
  let combo = 0;

  for (const result of results) {
    if (result.isCorrect) {
      combo++;
    } else {
      combo = 0;
    }
    totalXP += calcQuestionXP(result, combo);
  }

  return totalXP;
}

/**
 * Calculates score percentage.
 */
export function calcScore(results: QuestionResult[]): number {
  if (results.length === 0) return 0;
  const correct = results.filter((r) => r.isCorrect).length;
  return Math.round((correct / results.length) * 100);
}

/**
 * Determines user level from total XP.
 */
export function calcLevel(totalXp: number): number {
  if (totalXp < 200) return 1;
  if (totalXp < 500) return 2;
  if (totalXp < 1000) return 3;
  if (totalXp < 2000) return 4;
  return 5;
}

export const LEVEL_LABELS: Record<number, string> = {
  1: "Iniciante",
  2: "Aprendiz",
  3: "Estudante",
  4: "Avançado",
  5: "Especialista",
};

export const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, Infinity];

/**
 * Returns XP progress within the current level.
 */
export function getLevelProgress(totalXp: number): { current: number; max: number; level: number } {
  const level = calcLevel(totalXp);
  const min = LEVEL_THRESHOLDS[level - 1];
  const max = LEVEL_THRESHOLDS[level];
  return {
    current: totalXp - min,
    max: max === Infinity ? totalXp - min + 500 : max - min,
    level,
  };
}
