'use client';

import { useState, useCallback } from 'react';

export type GameMode = 'listening' | 'translation' | 'synonym' | 'fill_blank' | 'context_write' | 'context_fill';

export interface Vocabulary {
  id: number;
  word: string;
  meaning: string;
  definition: string;
  example: string;
  pronunciation_ipa?: string;
  audio_url?: string;
  cefr_level: string;
  mastery_level: number;
  synonyms?: Array<{ synonym_text: string }>;
  antonyms?: Array<{ antonym_text: string }>;
}

export interface GameResult {
  vocabularyId: number;
  activityType: GameMode;
  isCorrect: boolean;
  responseTime: number;
  userAnswer: string;
}

export interface ReviewQueueItem {
  vocab: Vocabulary;
  mode: GameMode;
  insertPosition: number;
}

export interface GameSessionState {
  currentIndex: number;
  mode: GameMode;
  score: number;
  streak: number;
  results: GameResult[];
  showResult: boolean;
  selectedAnswer: string;
  userInput: string;
  startTime: number;
  reviewQueue: ReviewQueueItem[];
  consecutiveIncorrectMap: Map<number, number>;
  gameSessionId: string;
  isComplete: boolean;
  aiFeedback: string | null;
  isLoadingAI: boolean;
  aiError: string | null;
}

export interface GameSessionActions {
  submit: (answer: string, vocabulary: Vocabulary, mode: GameMode) => Promise<{
    result: GameResult;
    correctAnswer: string;
    masteryChange: number;
    isCorrect: boolean;
  }>;
  next: () => void;
  reset: () => void;
  setMode: (mode: GameMode) => void;
  setShowResult: (show: boolean) => void;
  setSelectedAnswer: (answer: string) => void;
  setUserInput: (input: string) => void;
  setStartTime: (time: number) => void;
  addToReviewQueue: (vocab: Vocabulary, mode: GameMode) => void;
  setAiFeedback: (feedback: string | null) => void;
  setIsLoadingAI: (loading: boolean) => void;
  setAiError: (error: string | null) => void;
}

export interface UseGameSessionReturn {
  state: GameSessionState;
  actions: GameSessionActions;
}

export function useGameSession(totalVocabularies: number = 0): UseGameSessionReturn {
  const [state, setState] = useState<GameSessionState>({
    currentIndex: 0,
    mode: 'listening',
    score: 0,
    streak: 0,
    results: [],
    showResult: false,
    selectedAnswer: '',
    userInput: '',
    startTime: Date.now(),
    reviewQueue: [],
    consecutiveIncorrectMap: new Map(),
    gameSessionId: Math.random().toString(36).substring(7),
    isComplete: false,
    aiFeedback: null,
    isLoadingAI: false,
    aiError: null
  });

  const submit = useCallback(async (answer: string, vocabulary: Vocabulary, mode: GameMode) => {
    const responseTime = Date.now() - state.startTime;
    let userAnswer = answer.trim();
    let isCorrect = false;
    let correctAnswer = '';

    // Determine correct answer and check if user answer is correct
    switch (mode) {
      case 'listening':
        correctAnswer = vocabulary.word;
        isCorrect = userAnswer === correctAnswer;
        break;
        
      case 'translation':
        correctAnswer = vocabulary.word;
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        break;
        
      case 'synonym':
        if (vocabulary.synonyms && vocabulary.synonyms.length > 0) {
          correctAnswer = vocabulary.synonyms[0].synonym_text;
          isCorrect = vocabulary.synonyms.some(s => s.synonym_text === userAnswer);
        } else {
          correctAnswer = vocabulary.meaning;
          isCorrect = userAnswer === correctAnswer;
        }
        break;
        
      case 'fill_blank':
        correctAnswer = vocabulary.word;
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        break;
        
      case 'context_write':
        correctAnswer = vocabulary.word;
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        break;
        
      case 'context_fill':
        correctAnswer = vocabulary.word;
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        break;
    }

    const result: GameResult = {
      vocabularyId: vocabulary.id,
      activityType: mode,
      isCorrect,
      responseTime,
      userAnswer
    };

    // Update consecutive incorrect tracking
    const newConsecutiveIncorrectMap = new Map(state.consecutiveIncorrectMap);
    if (!isCorrect) {
      const currentCount = newConsecutiveIncorrectMap.get(vocabulary.id) || 0;
      newConsecutiveIncorrectMap.set(vocabulary.id, currentCount + 1);
    } else {
      newConsecutiveIncorrectMap.set(vocabulary.id, 0);
    }

    // Check if we need to pass the lowering flag (when consecutive count reaches 2)
    const consecutiveCount = newConsecutiveIncorrectMap.get(vocabulary.id) || 0;
    const shouldLowerMastery = consecutiveCount === 2;

    // Call the review API
    let masteryChange = 0;
    try {
      const apiResponse = await fetch('/api/vocab/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: vocabulary.id,
          isCorrect,
          activityType: mode,
          responseTimeMs: responseTime,
          userAnswer,
          sessionId: state.gameSessionId,
          shouldLowerMastery // Pass the lowering flag only when count==2
        })
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        masteryChange = apiData.masteryDelta || 0;
      }
    } catch (error) {
      console.error('Error updating vocabulary review:', error);
    }

    // Update state
    setState(prev => {
      const newResults = [...prev.results, result];
      let newStreak = isCorrect ? prev.streak + 1 : 0;
      let newScore = prev.score + (isCorrect ? 10 : 0);
      let newReviewQueue = [...prev.reviewQueue];

      // Add to review queue if incorrect (3-10 positions ahead)
      if (!isCorrect) {
        const reviewDistance = Math.floor(Math.random() * 8) + 3; // 3-10 words later
        const reviewItem = { 
          vocab: vocabulary, 
          mode: mode, 
          insertPosition: reviewDistance
        };
        
        // Insert at appropriate position in queue
        if (reviewDistance < newReviewQueue.length) {
          newReviewQueue.splice(reviewDistance, 0, reviewItem);
        } else {
          newReviewQueue.push(reviewItem);
        }
      }

      return {
        ...prev,
        results: newResults,
        score: newScore,
        streak: newStreak,
        showResult: true,
        reviewQueue: newReviewQueue,
        consecutiveIncorrectMap: newConsecutiveIncorrectMap
      };
    });

    return {
      result,
      correctAnswer,
      masteryChange,
      isCorrect
    };
  }, [state.startTime, state.consecutiveIncorrectMap, state.gameSessionId]);

  const next = useCallback(() => {
    setState(prev => {
      // Check if game is complete
      const isComplete = prev.reviewQueue.length === 0 && prev.currentIndex + 1 >= totalVocabularies;
      
      return {
        ...prev,
        currentIndex: prev.reviewQueue.length > 0 ? prev.currentIndex : prev.currentIndex + 1,
        showResult: false,
        selectedAnswer: '',
        userInput: '',
        startTime: Date.now(),
        isComplete
      };
    });
  }, [totalVocabularies]);

  const reset = useCallback(() => {
    setState({
      currentIndex: 0,
      mode: 'listening',
      score: 0,
      streak: 0,
      results: [],
      showResult: false,
      selectedAnswer: '',
      userInput: '',
      startTime: Date.now(),
      reviewQueue: [],
      consecutiveIncorrectMap: new Map(),
      gameSessionId: Math.random().toString(36).substring(7),
      isComplete: false,
      aiFeedback: null,
      isLoadingAI: false,
      aiError: null
    });
  }, []);

  const setMode = useCallback((mode: GameMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  const setShowResult = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showResult: show }));
  }, []);

  const setSelectedAnswer = useCallback((answer: string) => {
    setState(prev => ({ ...prev, selectedAnswer: answer }));
  }, []);

  const setUserInput = useCallback((input: string) => {
    setState(prev => ({ ...prev, userInput: input }));
  }, []);

  const setStartTime = useCallback((time: number) => {
    setState(prev => ({ ...prev, startTime: time }));
  }, []);

  const addToReviewQueue = useCallback((vocab: Vocabulary, mode: GameMode) => {
    setState(prev => {
      const reviewDistance = Math.floor(Math.random() * 8) + 3; // 3-10 words later
      const reviewItem = { 
        vocab, 
        mode, 
        insertPosition: reviewDistance
      };
      
      let newReviewQueue = [...prev.reviewQueue];
      // Insert at appropriate position in queue
      if (reviewDistance < newReviewQueue.length) {
        newReviewQueue.splice(reviewDistance, 0, reviewItem);
      } else {
        newReviewQueue.push(reviewItem);
      }

      return {
        ...prev,
        reviewQueue: newReviewQueue
      };
    });
  }, []);

  const setAiFeedback = useCallback((feedback: string | null) => {
    setState(prev => ({ ...prev, aiFeedback: feedback }));
  }, []);

  const setIsLoadingAI = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoadingAI: loading }));
  }, []);

  const setAiError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, aiError: error }));
  }, []);

  const actions: GameSessionActions = {
    submit,
    next,
    reset,
    setMode,
    setShowResult,
    setSelectedAnswer,
    setUserInput,
    setStartTime,
    addToReviewQueue,
    setAiFeedback,
    setIsLoadingAI,
    setAiError
  };

  return {
    state,
    actions
  };
}
