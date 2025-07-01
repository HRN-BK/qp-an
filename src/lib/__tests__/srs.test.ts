/**
 * Comprehensive tests for Spaced Repetition System (SRS) logic
 * Tests all edge cases and functionality
 */

import {
  calculateSpacedRepetition,
  isVocabularyDue,
  getMasteryLevelName,
  getSessionMemoryStats,
  clearUserSessionMemory,
  clearAllSessionMemory,
  MASTERY_LEVELS,
  REVIEW_INTERVALS,
  MASTERY_REACTIVATION_DAYS,
  VocabularyData,
  ReviewInput,
} from '../srs';

// Helper function to create mock vocabulary data
const createMockVocabulary = (overrides: Partial<VocabularyData> = {}): VocabularyData => ({
  id: 'test-vocab-1',
  mastery_level: MASTERY_LEVELS.NEW,
  last_mastered: null,
  last_reviewed: null,
  next_review: null,
  consecutive_correct: 0,
  consecutive_incorrect: 0,
  review_count: 0,
  ease_factor: 2.5,
  ...overrides,
});

// Helper function to create review input
const createReviewInput = (
  vocabulary_data: VocabularyData,
  is_correct: boolean,
  user_id: string = 'test-user'
): ReviewInput => ({
  vocabulary_id: vocabulary_data.id,
  user_id,
  is_correct,
  vocabulary_data,
});

describe('SRS - calculateSpacedRepetition', () => {
  beforeEach(() => {
    // Clear all session memory before each test for complete isolation
    clearAllSessionMemory();
  });

  describe('Mastery Level Progression', () => {
    it('should increase mastery level after 3 consecutive correct answers', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.NEW,
        consecutive_correct: 2, // Already has 2 correct
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));

      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.LEARNING);
      expect(result.mastery_changed).toBe(true);
      expect(result.update_needed).toBe(true);
    });

    it('should not exceed maximum mastery level', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MASTERED,
        consecutive_correct: 10,
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));

      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MASTERED);
      expect(result.mastery_changed).toBe(false);
    });

    it('should preserve mastery level on single wrong answer', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MATURE,
        consecutive_correct: 5,
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, false));

      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MATURE);
      expect(result.mastery_changed).toBe(false);
      expect(result.consecutive_incorrect_count).toBe(1);
    });

    it('should lower mastery level after 2 consecutive incorrect answers', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MATURE,
        consecutive_correct: 5,
      });

      // First wrong answer
      let result = calculateSpacedRepetition(createReviewInput(vocab, false));
      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MATURE);
      expect(result.consecutive_incorrect_count).toBe(1);

      // Second wrong answer
      result = calculateSpacedRepetition(createReviewInput(vocab, false));
      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.YOUNG);
      expect(result.mastery_changed).toBe(true);
      expect(result.consecutive_incorrect_count).toBe(2);
    });

    it('should not go below minimum mastery level', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.NEW,
      });

      // Two consecutive wrong answers
      calculateSpacedRepetition(createReviewInput(vocab, false));
      const result = calculateSpacedRepetition(createReviewInput(vocab, false));

      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.NEW);
    });

    it('should reset consecutive incorrect counter on correct answer', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MATURE,
      });

      // First wrong answer
      calculateSpacedRepetition(createReviewInput(vocab, false));
      
      // Correct answer should reset counter
      const result = calculateSpacedRepetition(createReviewInput(vocab, true));
      
      expect(result.consecutive_incorrect_count).toBe(0);
    });
  });

  describe('Mastered Word Reactivation', () => {
    it('should treat mastered words as due after 90 days', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 91); // 91 days ago

      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: pastDate.toISOString(),
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, false));

      // Should be treated as mature level for scheduling
      expect(result.new_mastery_level).toBeLessThanOrEqual(MASTERY_LEVELS.MATURE);
    });

    it('should not reactivate mastered words before 90 days', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: recentDate.toISOString(),
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));

      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MASTERED);
    });
  });

  describe('Review Scheduling', () => {
    it('should schedule review based on mastery level', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.YOUNG,
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));
      const expectedDays = REVIEW_INTERVALS[MASTERY_LEVELS.YOUNG];
      
      const nextReviewDate = new Date(result.next_review);
      const today = new Date();
      const daysDiff = Math.floor((nextReviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBeCloseTo(expectedDays, 0);
    });

    it('should apply ease factor for mature levels', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MATURE,
        ease_factor: 3.0,
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));
      const baseInterval = REVIEW_INTERVALS[MASTERY_LEVELS.MATURE];
      
      const nextReviewDate = new Date(result.next_review);
      const today = new Date();
      const daysDiff = Math.floor((nextReviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBeCloseTo(baseInterval * 3.0, 0);
    });
  });

  describe('Session Memory Management', () => {
    it('should track consecutive incorrect answers per user-vocabulary pair', () => {
      const vocab1 = createMockVocabulary({ id: 'vocab-1' });
      const vocab2 = createMockVocabulary({ id: 'vocab-2' });

      // Wrong answer for vocab1
      let result1 = calculateSpacedRepetition(createReviewInput(vocab1, false, 'user-1'));
      expect(result1.consecutive_incorrect_count).toBe(1);

      // Wrong answer for vocab2 (different vocabulary)
      let result2 = calculateSpacedRepetition(createReviewInput(vocab2, false, 'user-1'));
      expect(result2.consecutive_incorrect_count).toBe(1);

      // Another wrong answer for vocab1
      result1 = calculateSpacedRepetition(createReviewInput(vocab1, false, 'user-1'));
      expect(result1.consecutive_incorrect_count).toBe(2);

      // vocab2 should still be at 1
      result2 = calculateSpacedRepetition(createReviewInput(vocab2, false, 'user-1'));
      expect(result2.consecutive_incorrect_count).toBe(2);
    });

    it('should isolate session memory between different users', () => {
      const vocab = createMockVocabulary();

      // Wrong answer for user1
      let result1 = calculateSpacedRepetition(createReviewInput(vocab, false, 'user-1'));
      expect(result1.consecutive_incorrect_count).toBe(1);

      // Wrong answer for user2 (different user)
      let result2 = calculateSpacedRepetition(createReviewInput(vocab, false, 'user-2'));
      expect(result2.consecutive_incorrect_count).toBe(1);

      // Another wrong answer for user1
      result1 = calculateSpacedRepetition(createReviewInput(vocab, false, 'user-1'));
      expect(result1.consecutive_incorrect_count).toBe(2);

      // user2 should still be at 1
      result2 = calculateSpacedRepetition(createReviewInput(vocab, false, 'user-2'));
      expect(result2.consecutive_incorrect_count).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined dates gracefully', () => {
      const vocab = createMockVocabulary({
        last_mastered: null,
        last_reviewed: null,
        next_review: null,
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));

      expect(result.next_review).toBeDefined();
      expect(new Date(result.next_review)).toBeInstanceOf(Date);
    });

    it('should handle invalid ease factor', () => {
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MATURE,
        ease_factor: 0, // Invalid ease factor
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));

      expect(result.next_review).toBeDefined();
      expect(new Date(result.next_review)).toBeInstanceOf(Date);
    });

    it('should handle extreme consecutive counts', () => {
      const vocab = createMockVocabulary({
        consecutive_correct: 999,
        consecutive_incorrect: 999,
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));

      expect(result.new_mastery_level).toBeLessThanOrEqual(MASTERY_LEVELS.MASTERED);
      expect(result.new_mastery_level).toBeGreaterThanOrEqual(MASTERY_LEVELS.NEW);
    });

    it('should handle very old last_mastered dates', () => {
      const veryOldDate = new Date('2000-01-01');
      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: veryOldDate.toISOString(),
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, false));

      expect(result.new_mastery_level).toBeLessThanOrEqual(MASTERY_LEVELS.MATURE);
    });

    it('should handle future dates gracefully', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const vocab = createMockVocabulary({
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: futureDate.toISOString(),
      });

      const result = calculateSpacedRepetition(createReviewInput(vocab, true));

      expect(result.next_review).toBeDefined();
    });
  });
});

describe('SRS - isVocabularyDue', () => {
  it('should return true for new vocabulary', () => {
    const vocab = createMockVocabulary({
      mastery_level: MASTERY_LEVELS.NEW,
    });

    expect(isVocabularyDue(vocab)).toBe(true);
  });

  it('should return true when next_review date has passed', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const vocab = createMockVocabulary({
      mastery_level: MASTERY_LEVELS.LEARNING,
      next_review: pastDate.toISOString(),
    });

    expect(isVocabularyDue(vocab)).toBe(true);
  });

  it('should return false when next_review date is in the future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const vocab = createMockVocabulary({
      mastery_level: MASTERY_LEVELS.LEARNING,
      next_review: futureDate.toISOString(),
    });

    expect(isVocabularyDue(vocab)).toBe(false);
  });

  it('should return true for mastered words after 90 days', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 91);

    const vocab = createMockVocabulary({
      mastery_level: MASTERY_LEVELS.MASTERED,
      last_mastered: oldDate.toISOString(),
    });

    expect(isVocabularyDue(vocab)).toBe(true);
  });

  it('should return false for mastered words within 90 days', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);

    const vocab = createMockVocabulary({
      mastery_level: MASTERY_LEVELS.MASTERED,
      last_mastered: recentDate.toISOString(),
      next_review: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    });

    expect(isVocabularyDue(vocab)).toBe(false);
  });

  it('should return true when next_review is null', () => {
    const vocab = createMockVocabulary({
      mastery_level: MASTERY_LEVELS.LEARNING,
      next_review: null,
    });

    expect(isVocabularyDue(vocab)).toBe(true);
  });
});

describe('SRS - Utility Functions', () => {
  describe('getMasteryLevelName', () => {
    it('should return correct names for all mastery levels', () => {
      expect(getMasteryLevelName(MASTERY_LEVELS.NEW)).toBe('New');
      expect(getMasteryLevelName(MASTERY_LEVELS.LEARNING)).toBe('Learning');
      expect(getMasteryLevelName(MASTERY_LEVELS.YOUNG)).toBe('Young');
      expect(getMasteryLevelName(MASTERY_LEVELS.MATURE)).toBe('Mature');
      expect(getMasteryLevelName(MASTERY_LEVELS.PROFICIENT)).toBe('Proficient');
      expect(getMasteryLevelName(MASTERY_LEVELS.MASTERED)).toBe('Mastered');
    });

    it('should return "Unknown" for invalid levels', () => {
      expect(getMasteryLevelName(-1)).toBe('Unknown');
      expect(getMasteryLevelName(999)).toBe('Unknown');
      expect(getMasteryLevelName(1.5)).toBe('Unknown');
    });
  });

  describe('getSessionMemoryStats', () => {
    beforeEach(() => {
      clearAllSessionMemory();
    });

    it('should return empty stats initially', () => {
      const stats = getSessionMemoryStats();
      expect(stats.total_entries).toBe(0);
      expect(stats.entries_by_user).toEqual({});
    });

    it('should track session memory entries', () => {
      const vocab1 = createMockVocabulary({ id: 'vocab-1' });
      const vocab2 = createMockVocabulary({ id: 'vocab-2' });

      // Create session memory entries
      calculateSpacedRepetition(createReviewInput(vocab1, false, 'user-1'));
      calculateSpacedRepetition(createReviewInput(vocab2, false, 'user-1'));
      calculateSpacedRepetition(createReviewInput(vocab1, false, 'user-2'));

      const stats = getSessionMemoryStats();
      expect(stats.total_entries).toBe(3);
      expect(stats.entries_by_user['user-1']).toBe(2);
      expect(stats.entries_by_user['user-2']).toBe(1);
    });
  });

  describe('clearUserSessionMemory', () => {
    beforeEach(() => {
      clearAllSessionMemory();
    });

    it('should clear session memory for specific user only', () => {
      const vocab = createMockVocabulary();

      // Create session memory for multiple users
      calculateSpacedRepetition(createReviewInput(vocab, false, 'user-1'));
      calculateSpacedRepetition(createReviewInput(vocab, false, 'user-2'));

      let stats = getSessionMemoryStats();
      expect(stats.total_entries).toBe(2);

      // Clear only user-1's session memory
      clearUserSessionMemory('user-1');

      stats = getSessionMemoryStats();
      expect(stats.total_entries).toBe(1);
      expect(stats.entries_by_user['user-2']).toBe(1);
      expect(stats.entries_by_user['user-1']).toBeUndefined();
    });
  });
});

describe('SRS - Constants', () => {
  it('should export correct mastery levels', () => {
    expect(MASTERY_LEVELS.NEW).toBe(0);
    expect(MASTERY_LEVELS.LEARNING).toBe(1);
    expect(MASTERY_LEVELS.YOUNG).toBe(2);
    expect(MASTERY_LEVELS.MATURE).toBe(3);
    expect(MASTERY_LEVELS.PROFICIENT).toBe(4);
    expect(MASTERY_LEVELS.MASTERED).toBe(5);
  });

  it('should export correct review intervals', () => {
    expect(REVIEW_INTERVALS[MASTERY_LEVELS.NEW]).toBe(1);
    expect(REVIEW_INTERVALS[MASTERY_LEVELS.LEARNING]).toBe(3);
    expect(REVIEW_INTERVALS[MASTERY_LEVELS.YOUNG]).toBe(7);
    expect(REVIEW_INTERVALS[MASTERY_LEVELS.MATURE]).toBe(21);
    expect(REVIEW_INTERVALS[MASTERY_LEVELS.PROFICIENT]).toBe(60);
    expect(REVIEW_INTERVALS[MASTERY_LEVELS.MASTERED]).toBe(180);
  });

  it('should export correct reactivation days', () => {
    expect(MASTERY_REACTIVATION_DAYS).toBe(90);
  });
});
