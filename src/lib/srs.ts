/**
 * Spaced Repetition System (SRS) Logic
 * 
 * This module encapsulates the spaced repetition algorithm with mastery levels.
 * Key features:
 * - Preserves mastery level on single wrong answers
 * - Tracks consecutive_incorrect in session memory
 * - Lowers mastery only when consecutive_incorrect hits 2
 * - Treats mastery_level 5 words as due if last_mastered > 90 days
 */

// Session memory for tracking consecutive incorrect answers
// In a real production environment, this could be Redis or similar
const sessionMemory = new Map<string, { consecutive_incorrect: number; last_updated: Date }>();

// Constants for SRS algorithm
const MASTERY_LEVELS = {
  NEW: 0,
  LEARNING: 1,
  YOUNG: 2,
  MATURE: 3,
  PROFICIENT: 4,
  MASTERED: 5
} as const;

const REVIEW_INTERVALS = {
  [MASTERY_LEVELS.NEW]: 1,        // 1 day
  [MASTERY_LEVELS.LEARNING]: 3,   // 3 days
  [MASTERY_LEVELS.YOUNG]: 7,      // 1 week
  [MASTERY_LEVELS.MATURE]: 21,    // 3 weeks
  [MASTERY_LEVELS.PROFICIENT]: 60, // 2 months
  [MASTERY_LEVELS.MASTERED]: 180   // 6 months
} as const;

const MASTERY_REACTIVATION_DAYS = 90; // Days after which mastered words become due again

export interface VocabularyData {
  id: string;
  mastery_level: number;
  last_mastered: string | null;
  last_reviewed: string | null;
  next_review: string | null;
  consecutive_correct: number;
  consecutive_incorrect: number;
  review_count: number;
  ease_factor: number;
}

export interface ReviewResult {
  next_review: string;
  new_mastery_level: number;
  update_needed: boolean;
  consecutive_incorrect_count: number;
  mastery_changed: boolean;
}

export interface ReviewInput {
  vocabulary_id: string;
  user_id: string;
  is_correct: boolean;
  vocabulary_data: VocabularyData;
}

/**
 * Clean up old session memory entries (older than 24 hours)
 */
function cleanupSessionMemory(): void {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  // Convert entries to array to avoid iterator issues
  const entries = Array.from(sessionMemory.entries());
  for (const [key, data] of entries) {
    if (data.last_updated < cutoff) {
      sessionMemory.delete(key);
    }
  }
}

/**
 * Get session memory key for a user's vocabulary
 */
function getSessionKey(user_id: string, vocabulary_id: string): string {
  return `${user_id}:${vocabulary_id}`;
}

/**
 * Check if a mastered word (level 5) should be treated as due again
 */
function isMasteredWordDue(vocabulary_data: VocabularyData): boolean {
  if (vocabulary_data.mastery_level !== MASTERY_LEVELS.MASTERED) {
    return false;
  }
  
  if (!vocabulary_data.last_mastered) {
    return false;
  }
  
  const lastMastered = new Date(vocabulary_data.last_mastered);
  const now = new Date();
  const daysSinceLastMastered = Math.floor((now.getTime() - lastMastered.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceLastMastered > MASTERY_REACTIVATION_DAYS;
}

/**
 * Calculate the next review date based on mastery level
 */
function calculateNextReview(mastery_level: number, ease_factor: number = 2.5): Date {
  const baseInterval = REVIEW_INTERVALS[mastery_level as keyof typeof REVIEW_INTERVALS] || 1;
  
  // Apply ease factor for more advanced levels
  let interval: number = baseInterval;
  if (mastery_level >= MASTERY_LEVELS.MATURE) {
    interval = Math.round(baseInterval * ease_factor);
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  
  return nextReview;
}

/**
 * Update mastery level based on performance
 */
function updateMasteryLevel(
  current_level: number,
  is_correct: boolean,
  consecutive_correct: number,
  consecutive_incorrect_session: number
): number {
  if (is_correct) {
    // Increase mastery level based on consecutive correct answers
    if (consecutive_correct >= 3 && current_level < MASTERY_LEVELS.MASTERED) {
      return Math.min(current_level + 1, MASTERY_LEVELS.MASTERED);
    }
    return current_level;
  } else {
    // Only decrease mastery level when consecutive incorrect hits 2
    if (consecutive_incorrect_session >= 2 && current_level > MASTERY_LEVELS.NEW) {
      return Math.max(current_level - 1, MASTERY_LEVELS.NEW);
    }
    return current_level; // Preserve mastery level on single wrong answers
  }
}

/**
 * Main SRS calculation function
 */
export function calculateSpacedRepetition(input: ReviewInput): ReviewResult {
  // Clean up old session memory periodically
  if (Math.random() < 0.1) { // 10% chance to clean up
    cleanupSessionMemory();
  }
  
  const { vocabulary_id, user_id, is_correct, vocabulary_data } = input;
  const sessionKey = getSessionKey(user_id, vocabulary_id);
  
  // Get or initialize session memory
  let sessionData = sessionMemory.get(sessionKey);
  if (!sessionData) {
    sessionData = { consecutive_incorrect: 0, last_updated: new Date() };
    sessionMemory.set(sessionKey, sessionData);
  }
  
  // Update session memory
  if (is_correct) {
    sessionData.consecutive_incorrect = 0;
  } else {
    sessionData.consecutive_incorrect += 1;
  }
  sessionData.last_updated = new Date();
  
  // Calculate new mastery level
  const current_mastery = vocabulary_data.mastery_level;
  let new_mastery_level = updateMasteryLevel(
    current_mastery,
    is_correct,
    vocabulary_data.consecutive_correct + (is_correct ? 1 : 0),
    sessionData.consecutive_incorrect
  );
  
  // Special handling for mastered words that are due again
  if (isMasteredWordDue(vocabulary_data)) {
    // Treat as if it's a mature word for scheduling purposes
    new_mastery_level = Math.min(new_mastery_level, MASTERY_LEVELS.MATURE);
  }
  
  // Calculate next review date
  const next_review = calculateNextReview(new_mastery_level, vocabulary_data.ease_factor);
  
  // Determine if database update is needed
  const update_needed = 
    new_mastery_level !== current_mastery ||
    vocabulary_data.consecutive_correct !== (vocabulary_data.consecutive_correct + (is_correct ? 1 : 0)) ||
    vocabulary_data.consecutive_incorrect !== (vocabulary_data.consecutive_incorrect + (is_correct ? 0 : 1));
  
  return {
    next_review: next_review.toISOString(),
    new_mastery_level,
    update_needed,
    consecutive_incorrect_count: sessionData.consecutive_incorrect,
    mastery_changed: new_mastery_level !== current_mastery
  };
}

/**
 * Check if a vocabulary item is due for review
 */
export function isVocabularyDue(vocabulary_data: VocabularyData): boolean {
  // New words are always due
  if (vocabulary_data.mastery_level === MASTERY_LEVELS.NEW) {
    return true;
  }
  
  // Check if next_review date has passed
  if (!vocabulary_data.next_review) {
    return true;
  }
  
  const nextReview = new Date(vocabulary_data.next_review);
  const now = new Date();
  
  if (now >= nextReview) {
    return true;
  }
  
  // Check if mastered word is due for reactivation
  if (vocabulary_data.mastery_level === MASTERY_LEVELS.MASTERED && isMasteredWordDue(vocabulary_data)) {
    return true;
  }
  
  return false;
}

/**
 * Get the mastery level name for display purposes
 */
export function getMasteryLevelName(level: number): string {
  switch (level) {
    case MASTERY_LEVELS.NEW: return 'New';
    case MASTERY_LEVELS.LEARNING: return 'Learning';
    case MASTERY_LEVELS.YOUNG: return 'Young';
    case MASTERY_LEVELS.MATURE: return 'Mature';
    case MASTERY_LEVELS.PROFICIENT: return 'Proficient';
    case MASTERY_LEVELS.MASTERED: return 'Mastered';
    default: return 'Unknown';
  }
}

/**
 * Get session memory statistics for debugging
 */
export function getSessionMemoryStats(): { 
  total_entries: number; 
  entries_by_user: Record<string, number> 
} {
  const stats = { total_entries: sessionMemory.size, entries_by_user: {} as Record<string, number> };
  
  // Convert keys to array to avoid iterator issues
  const keys = Array.from(sessionMemory.keys());
  for (const key of keys) {
    const user_id = key.split(':')[0];
    stats.entries_by_user[user_id] = (stats.entries_by_user[user_id] || 0) + 1;
  }
  
  return stats;
}

/**
 * Clear session memory for a specific user (useful for testing or user logout)
 */
export function clearUserSessionMemory(user_id: string): void {
  // Convert keys to array to avoid iterator issues
  const keys = Array.from(sessionMemory.keys());
  for (const key of keys) {
    if (key.startsWith(`${user_id}:`)) {
      sessionMemory.delete(key);
    }
  }
}

/**
 * Clear all session memory (useful for testing)
 */
export function clearAllSessionMemory(): void {
  sessionMemory.clear();
}

/**
 * Export constants for use in other modules
 */
export { MASTERY_LEVELS, REVIEW_INTERVALS, MASTERY_REACTIVATION_DAYS };
