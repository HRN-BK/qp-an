// src/lib/sm2.ts
// Simple SM-2 algorithm helper
// https://www.supermemo.com/esm/algorithm/sm2

export interface SM2State {
  repetitions: number; // successful repetitions (0 for new)
  easeFactor: number;  // EF, typical 1.3 - 2.5
  interval: number;    // current interval (days)
}

export interface SM2Result extends SM2State {
  nextReview: Date;
}

/**
 * Update spaced-repetition scheduling values based on quality score (0-5)
 * Returns new repetitions, EF, interval and next review date.
 */
export function updateSM2(
  state: SM2State,
  quality: number,
  today: Date = new Date()
): SM2Result {
  let { repetitions, easeFactor, interval } = state;

  // Ensure EF is at least 1.3
  easeFactor = Math.max(1.3, easeFactor);

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update EF according to SM-2 formula
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, parseFloat(easeFactor.toFixed(2)));

  const nextReview = new Date(today.getTime() + interval * 24 * 60 * 60 * 1000);

  return { repetitions, easeFactor, interval, nextReview };
}

