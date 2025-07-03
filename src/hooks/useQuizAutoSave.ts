'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GameResult } from './useGameSession';

interface UseQuizAutoSaveProps {
  sessionId: string;
  results: GameResult[];
  currentIndex: number;
  totalVocabularies: number;
  score: number;
  streak: number;
  isComplete: boolean;
  enabled?: boolean;
  saveIntervalMs?: number;
}

export function useQuizAutoSave({
  sessionId,
  results,
  currentIndex,
  totalVocabularies,
  score,
  streak,
  isComplete,
  enabled = true,
  saveIntervalMs = 30000 // Default: save every 30 seconds
}: UseQuizAutoSaveProps) {
  const lastSaveRef = useRef<{
    resultsCount: number;
    timestamp: number;
  }>({
    resultsCount: 0,
    timestamp: Date.now()
  });

  const saveInProgress = useRef(false);

  const saveProgress = useCallback(async (force = false) => {
    if (!enabled || saveInProgress.current) {
      return;
    }

    // Don't save if no new results and not forced
    if (!force && results.length === lastSaveRef.current.resultsCount) {
      return;
    }

    saveInProgress.current = true;

    try {
      const vocabularyResults = results.map(result => ({
        vocabularyId: result.vocabularyId,
        activityType: result.activityType,
        isCorrect: result.isCorrect,
        responseTime: result.responseTime,
        userAnswer: result.userAnswer
      }));

      const response = await fetch('/api/quiz/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          vocabularyResults,
          currentIndex,
          totalVocabularies,
          score,
          streak,
          isComplete
        })
      });

      if (response.ok) {
        lastSaveRef.current = {
          resultsCount: results.length,
          timestamp: Date.now()
        };
        console.log('Quiz progress saved successfully');
      } else {
        console.error('Failed to save quiz progress:', await response.text());
      }
    } catch (error) {
      console.error('Error saving quiz progress:', error);
    } finally {
      saveInProgress.current = false;
    }
  }, [sessionId, results, currentIndex, totalVocabularies, score, streak, isComplete, enabled]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      saveProgress();
    }, saveIntervalMs);

    return () => clearInterval(interval);
  }, [saveProgress, saveIntervalMs, enabled]);

  // Save when results change (debounced)
  useEffect(() => {
    if (!enabled || results.length === 0) return;

    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 5000); // Wait 5 seconds after last result before saving

    return () => clearTimeout(timeoutId);
  }, [results, saveProgress, enabled]);

  // Save when quiz completes
  useEffect(() => {
    if (isComplete && enabled) {
      saveProgress(true); // Force save on completion
    }
  }, [isComplete, saveProgress, enabled]);

  // Save on beforeunload (page exit)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Note: Modern browsers don't allow synchronous requests in beforeunload
      // We'll use sendBeacon for better reliability
      if (results.length > lastSaveRef.current.resultsCount) {
        const vocabularyResults = results.map(result => ({
          vocabularyId: result.vocabularyId,
          activityType: result.activityType,
          isCorrect: result.isCorrect,
          responseTime: result.responseTime,
          userAnswer: result.userAnswer
        }));

        const data = JSON.stringify({
          sessionId,
          vocabularyResults,
          currentIndex,
          totalVocabularies,
          score,
          streak,
          isComplete
        });

        // Use sendBeacon for reliable delivery
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/quiz/progress', data);
        }

        // Show confirmation dialog if user is leaving mid-quiz
        if (!isComplete && results.length > 0) {
          event.preventDefault();
          event.returnValue = 'You have unsaved quiz progress. Are you sure you want to leave?';
          return event.returnValue;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Save when tab becomes hidden
        saveProgress();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, results, currentIndex, totalVocabularies, score, streak, isComplete, enabled, saveProgress]);

  // Manual save function
  const manualSave = useCallback(() => {
    return saveProgress(true);
  }, [saveProgress]);

  return {
    saveProgress: manualSave,
    lastSaved: lastSaveRef.current.timestamp,
    isSaving: saveInProgress.current
  };
}
