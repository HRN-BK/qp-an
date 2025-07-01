/**
 * Unit tests for SRS (Spaced Repetition System) module
 * Tests edge cases and core functionality
 */

import {
  calculateSpacedRepetition,
  isVocabularyDue,
  getMasteryLevelName,
  clearAllSessionMemory,
  clearUserSessionMemory,
  getSessionMemoryStats,
  MASTERY_LEVELS,
  REVIEW_INTERVALS,
  MASTERY_REACTIVATION_DAYS,
  type VocabularyData,
  type ReviewInput
} from '../src/lib/srs';

describe('SRS Module', () => {
  beforeEach(() => {
    // Clear session memory before each test
    clearAllSessionMemory();
  });

  describe('calculateSpacedRepetition', () => {
    it('should preserve mastery level on single wrong answer', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MATURE,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 5,
        consecutive_incorrect: 0,
        review_count: 10,
        ease_factor: 2.5
      };

      const input: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      const result = calculateSpacedRepetition(input);

      // Mastery level should be preserved on first wrong answer
      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MATURE);
      expect(result.mastery_changed).toBe(false);
      expect(result.consecutive_incorrect_count).toBe(1);
    });

    it('should lower mastery level after 2 consecutive wrong answers', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MATURE,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 5,
        consecutive_incorrect: 0,
        review_count: 10,
        ease_factor: 2.5
      };

      const input: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      // First wrong answer
      let result = calculateSpacedRepetition(input);
      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MATURE);
      expect(result.consecutive_incorrect_count).toBe(1);

      // Second wrong answer
      result = calculateSpacedRepetition(input);
      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.YOUNG);
      expect(result.mastery_changed).toBe(true);
      expect(result.consecutive_incorrect_count).toBe(2);
    });

    it('should reset consecutive incorrect on correct answer', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MATURE,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 5,
        consecutive_incorrect: 0,
        review_count: 10,
        ease_factor: 2.5
      };

      // Wrong answer first
      let input: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      let result = calculateSpacedRepetition(input);
      expect(result.consecutive_incorrect_count).toBe(1);

      // Correct answer should reset count
      input.is_correct = true;
      result = calculateSpacedRepetition(input);
      expect(result.consecutive_incorrect_count).toBe(0);
    });

    it('should increase mastery level after 3 consecutive correct answers', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.YOUNG,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 2, // Already has 2 correct
        consecutive_incorrect: 0,
        review_count: 5,
        ease_factor: 2.5
      };

      const input: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: true,
        vocabulary_data: vocabularyData
      };

      const result = calculateSpacedRepetition(input);

      // Should increase to MATURE (3 consecutive correct total)
      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MATURE);
      expect(result.mastery_changed).toBe(true);
    });

    it('should not increase mastery beyond MASTERED level', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: new Date().toISOString(),
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 10,
        consecutive_incorrect: 0,
        review_count: 20,
        ease_factor: 2.5
      };

      const input: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: true,
        vocabulary_data: vocabularyData
      };

      const result = calculateSpacedRepetition(input);

      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.MASTERED);
      expect(result.mastery_changed).toBe(false);
    });

    it('should not decrease mastery below NEW level', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.NEW,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 0,
        consecutive_incorrect: 0,
        review_count: 1,
        ease_factor: 2.5
      };

      const input: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      // Multiple wrong answers
      let result = calculateSpacedRepetition(input);
      result = calculateSpacedRepetition(input);

      expect(result.new_mastery_level).toBe(MASTERY_LEVELS.NEW);
    });
  });

  describe('isVocabularyDue', () => {
    it('should return true for NEW words', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.NEW,
        last_mastered: null,
        last_reviewed: null,
        next_review: null,
        consecutive_correct: 0,
        consecutive_incorrect: 0,
        review_count: 0,
        ease_factor: 2.5
      };

      expect(isVocabularyDue(vocabularyData)).toBe(true);
    });

    it('should return true for words past their review date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.LEARNING,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: pastDate.toISOString(),
        consecutive_correct: 1,
        consecutive_incorrect: 0,
        review_count: 1,
        ease_factor: 2.5
      };

      expect(isVocabularyDue(vocabularyData)).toBe(true);
    });

    it('should return false for words not yet due', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // Next week

      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.YOUNG,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: futureDate.toISOString(),
        consecutive_correct: 3,
        consecutive_incorrect: 0,
        review_count: 5,
        ease_factor: 2.5
      };

      expect(isVocabularyDue(vocabularyData)).toBe(false);
    });

    it('should return true for mastered words after 90 days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: oldDate.toISOString(),
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 10,
        consecutive_incorrect: 0,
        review_count: 20,
        ease_factor: 2.5
      };

      expect(isVocabularyDue(vocabularyData)).toBe(true);
    });

    it('should return false for recently mastered words', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60); // 60 days in future

      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: recentDate.toISOString(),
        last_reviewed: new Date().toISOString(),
        next_review: futureDate.toISOString(),
        consecutive_correct: 10,
        consecutive_incorrect: 0,
        review_count: 20,
        ease_factor: 2.5
      };

      expect(isVocabularyDue(vocabularyData)).toBe(false);
    });
  });

  describe('getMasteryLevelName', () => {
    it('should return correct names for all mastery levels', () => {
      expect(getMasteryLevelName(MASTERY_LEVELS.NEW)).toBe('New');
      expect(getMasteryLevelName(MASTERY_LEVELS.LEARNING)).toBe('Learning');
      expect(getMasteryLevelName(MASTERY_LEVELS.YOUNG)).toBe('Young');
      expect(getMasteryLevelName(MASTERY_LEVELS.MATURE)).toBe('Mature');
      expect(getMasteryLevelName(MASTERY_LEVELS.PROFICIENT)).toBe('Proficient');
      expect(getMasteryLevelName(MASTERY_LEVELS.MASTERED)).toBe('Mastered');
      expect(getMasteryLevelName(999)).toBe('Unknown');
    });
  });

  describe('Session Memory Management', () => {
    it('should track different users separately', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MATURE,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 5,
        consecutive_incorrect: 0,
        review_count: 10,
        ease_factor: 2.5
      };

      // User 1 makes wrong answer
      const input1: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      // User 2 makes wrong answer
      const input2: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-2',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      calculateSpacedRepetition(input1);
      calculateSpacedRepetition(input2);

      const stats = getSessionMemoryStats();
      expect(stats.total_entries).toBe(2);
      expect(stats.entries_by_user['user-1']).toBe(1);
      expect(stats.entries_by_user['user-2']).toBe(1);
    });

    it('should clear user session memory correctly', () => {
      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MATURE,
        last_mastered: null,
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 5,
        consecutive_incorrect: 0,
        review_count: 10,
        ease_factor: 2.5
      };

      // Create session data for multiple users
      const input1: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      const input2: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-2',
        is_correct: false,
        vocabulary_data: vocabularyData
      };

      calculateSpacedRepetition(input1);
      calculateSpacedRepetition(input2);

      // Clear user-1 session memory
      clearUserSessionMemory('user-1');

      const stats = getSessionMemoryStats();
      expect(stats.total_entries).toBe(1);
      expect(stats.entries_by_user['user-1']).toBeUndefined();
      expect(stats.entries_by_user['user-2']).toBe(1);
    });

    it('should handle edge case with reactivated mastered words', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const vocabularyData: VocabularyData = {
        id: 'vocab-1',
        mastery_level: MASTERY_LEVELS.MASTERED,
        last_mastered: oldDate.toISOString(),
        last_reviewed: new Date().toISOString(),
        next_review: null,
        consecutive_correct: 10,
        consecutive_incorrect: 0,
        review_count: 20,
        ease_factor: 2.5
      };

      const input: ReviewInput = {
        vocabulary_id: 'vocab-1',
        user_id: 'user-1',
        is_correct: true,
        vocabulary_data: vocabularyData
      };

      const result = calculateSpacedRepetition(input);

      // Should treat as mature word level even though originally mastered
      expect(result.new_mastery_level).toBeLessThanOrEqual(MASTERY_LEVELS.MATURE);
    });
  });

  describe('Constants and Intervals', () => {
    it('should have correct review intervals', () => {
      expect(REVIEW_INTERVALS[MASTERY_LEVELS.NEW]).toBe(1);
      expect(REVIEW_INTERVALS[MASTERY_LEVELS.LEARNING]).toBe(3);
      expect(REVIEW_INTERVALS[MASTERY_LEVELS.YOUNG]).toBe(7);
      expect(REVIEW_INTERVALS[MASTERY_LEVELS.MATURE]).toBe(21);
      expect(REVIEW_INTERVALS[MASTERY_LEVELS.PROFICIENT]).toBe(60);
      expect(REVIEW_INTERVALS[MASTERY_LEVELS.MASTERED]).toBe(180);
    });

    it('should have correct mastery reactivation threshold', () => {
      expect(MASTERY_REACTIVATION_DAYS).toBe(90);
    });
  });
});
