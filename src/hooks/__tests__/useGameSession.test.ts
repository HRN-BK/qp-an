import { renderHook, act } from '@testing-library/react';
import { useGameSession, Vocabulary, GameMode } from '../useGameSession';

// Mock fetch for API calls
global.fetch = jest.fn();

const mockVocabulary: Vocabulary = {
  id: 1,
  word: 'test',
  meaning: 'thử nghiệm',
  definition: 'a procedure intended to establish the quality',
  example: 'This is a test sentence.',
  cefr_level: 'B1',
  mastery_level: 1,
  synonyms: [{ synonym_text: 'exam' }],
  antonyms: [{ antonym_text: 'practice' }]
};

describe('useGameSession', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ masteryDelta: 5 })
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGameSession(10));
    
    expect(result.current.state.score).toBe(0);
    expect(result.current.state.streak).toBe(0);
    expect(result.current.state.currentIndex).toBe(0);
    expect(result.current.state.mode).toBe('listening');
    expect(result.current.state.results).toEqual([]);
    expect(result.current.state.reviewQueue).toEqual([]);
    expect(result.current.state.isComplete).toBe(false);
  });

  it('should handle correct answer submission', async () => {
    const { result } = renderHook(() => useGameSession(10));
    
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000); // 1 second ago
      const response = await result.current.actions.submit('test', mockVocabulary, 'listening');
      
      expect(response.isCorrect).toBe(true);
      expect(response.correctAnswer).toBe('test');
    });

    expect(result.current.state.score).toBe(10);
    expect(result.current.state.streak).toBe(1);
    expect(result.current.state.results).toHaveLength(1);
    expect(result.current.state.showResult).toBe(true);
  });

  it('should handle incorrect answer submission', async () => {
    const { result } = renderHook(() => useGameSession(10));
    
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000);
      const response = await result.current.actions.submit('wrong', mockVocabulary, 'listening');
      
      expect(response.isCorrect).toBe(false);
      expect(response.correctAnswer).toBe('test');
    });

    expect(result.current.state.score).toBe(0);
    expect(result.current.state.streak).toBe(0);
    expect(result.current.state.reviewQueue).toHaveLength(1);
    expect(result.current.state.consecutiveIncorrectMap.get(1)).toBe(1);
  });

  it('should handle different game modes correctly', async () => {
    const { result } = renderHook(() => useGameSession(10));
    
    // Test translation mode
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000);
      const response = await result.current.actions.submit('TEST', mockVocabulary, 'translation');
      expect(response.isCorrect).toBe(true); // Should be case insensitive
    });

    // Test synonym mode
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000);
      const response = await result.current.actions.submit('exam', mockVocabulary, 'synonym');
      expect(response.isCorrect).toBe(true);
    });

    // Test fill_blank mode
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000);
      const response = await result.current.actions.submit('test', mockVocabulary, 'fill_blank');
      expect(response.isCorrect).toBe(true);
    });
  });

  it('should advance to next question', () => {
    const { result } = renderHook(() => useGameSession(10));
    
    act(() => {
      result.current.actions.next();
    });

    expect(result.current.state.currentIndex).toBe(1);
    expect(result.current.state.showResult).toBe(false);
    expect(result.current.state.selectedAnswer).toBe('');
    expect(result.current.state.userInput).toBe('');
  });

  it('should mark game as complete when reaching the end', () => {
    const { result } = renderHook(() => useGameSession(1));
    
    act(() => {
      result.current.actions.next();
    });

    expect(result.current.state.isComplete).toBe(true);
  });

  it('should reset game state', () => {
    const { result } = renderHook(() => useGameSession(10));
    
    // First, modify the state
    act(() => {
      result.current.actions.setSelectedAnswer('test');
      result.current.actions.next();
    });

    // Then reset
    act(() => {
      result.current.actions.reset();
    });

    expect(result.current.state.currentIndex).toBe(0);
    expect(result.current.state.score).toBe(0);
    expect(result.current.state.streak).toBe(0);
    expect(result.current.state.selectedAnswer).toBe('');
    expect(result.current.state.results).toEqual([]);
    expect(result.current.state.reviewQueue).toEqual([]);
    expect(result.current.state.isComplete).toBe(false);
  });

  it('should update selected answer', () => {
    const { result } = renderHook(() => useGameSession(10));
    
    act(() => {
      result.current.actions.setSelectedAnswer('test-answer');
    });

    expect(result.current.state.selectedAnswer).toBe('test-answer');
  });

  it('should update user input', () => {
    const { result } = renderHook(() => useGameSession(10));
    
    act(() => {
      result.current.actions.setUserInput('test-input');
    });

    expect(result.current.state.userInput).toBe('test-input');
  });

  it('should update game mode', () => {
    const { result } = renderHook(() => useGameSession(10));
    
    act(() => {
      result.current.actions.setMode('translation');
    });

    expect(result.current.state.mode).toBe('translation');
  });

  it('should add vocabulary to review queue', () => {
    const { result } = renderHook(() => useGameSession(10));
    
    act(() => {
      result.current.actions.addToReviewQueue(mockVocabulary, 'listening');
    });

    expect(result.current.state.reviewQueue).toHaveLength(1);
    expect(result.current.state.reviewQueue[0].vocab).toBe(mockVocabulary);
    expect(result.current.state.reviewQueue[0].mode).toBe('listening');
  });

  it('should track consecutive incorrect answers', async () => {
    const { result } = renderHook(() => useGameSession(10));
    
    // First incorrect answer
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000);
      await result.current.actions.submit('wrong1', mockVocabulary, 'listening');
    });

    expect(result.current.state.consecutiveIncorrectMap.get(1)).toBe(1);

    // Second incorrect answer - should trigger mastery lowering
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000);
      await result.current.actions.submit('wrong2', mockVocabulary, 'listening');
    });

    expect(result.current.state.consecutiveIncorrectMap.get(1)).toBe(2);
    
    // Verify API was called with shouldLowerMastery flag
    expect(fetch).toHaveBeenCalledWith('/api/vocab/review', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"shouldLowerMastery":true')
    }));

    // Correct answer should reset counter
    await act(async () => {
      result.current.actions.setStartTime(Date.now() - 1000);
      await result.current.actions.submit('test', mockVocabulary, 'listening');
    });

    expect(result.current.state.consecutiveIncorrectMap.get(1)).toBe(0);
  });
});
