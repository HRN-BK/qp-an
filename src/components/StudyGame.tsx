'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Volume2, Check, X, RotateCcw, Zap, Target, Trophy, BookOpen, Eye, Headphones, LanguagesIcon, FileText, Save } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { playPronunciation, setUserInteractionDetected } from '@/lib/audio-utils';
import { useQuizAutoSave } from '@/hooks/useQuizAutoSave';

interface Vocabulary {
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

interface StudyGameProps {
  vocabularies: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
}

interface GameResult {
  vocabularyId: number;
  activityType: GameMode;
  isCorrect: boolean;
  responseTime: number;
  userAnswer: string;
  aiScore?: number;
  aiFeedback?: string;
  aiSuggestions?: {
    improvements: string[];
    collocations: string[];
  };
}

type GameMode = 'listening' | 'translation' | 'synonym' | 'fill_blank' | 'context_write' | 'context_fill';

interface ReviewQueueItem {
  vocab: Vocabulary;
  mode: GameMode;
  insertPosition: number;
}

interface GameState {
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
  aiFeedback: string | null;
  isLoadingAI: boolean;
  aiError: string | null;
  generatedSentence: string | null;
  isLoadingSentence: boolean;
  sentenceError: string | null;
}

import { ResultCard } from './ResultCard';
import { QuizResultsDetail } from './QuizResultsDetail';

export default function StudyGame({ vocabularies, onComplete }: StudyGameProps) {
  const [gameState, setGameState] = useState<GameState>({
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
    aiFeedback: null,
    isLoadingAI: false,
    aiError: null,
    generatedSentence: null,
    isLoadingSentence: false,
    sentenceError: null
  });

  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [currentVocab, setCurrentVocab] = useState<Vocabulary | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [lastResult, setLastResult] = useState<{
    vocab: Vocabulary;
    result: GameResult;
    correctAnswer: string;
    masteryChange: number;
    aiScore?: number;
    aiFeedback?: string;
    aiSuggestions?: {
      improvements: string[];
      collocations: string[];
    };
  } | null>(null);

  // Auto-save functionality
  const { saveProgress, isSaving } = useQuizAutoSave({
    sessionId: gameState.gameSessionId,
    results: gameState.results,
    currentIndex: gameState.currentIndex,
    totalVocabularies: vocabularies.length,
    score: gameState.score,
    streak: gameState.streak,
    isComplete: gameComplete,
    enabled: true,
    saveIntervalMs: 30000 // Save every 30 seconds
  });


  // Game modes with weighted selection for variety
  const gameModes: { mode: GameMode; weight: number }[] = [
    { mode: 'listening', weight: 3 },
    { mode: 'translation', weight: 3 },
    { mode: 'synonym', weight: 2 },
    { mode: 'fill_blank', weight: 3 },
    { mode: 'context_write', weight: 2 },
    { mode: 'context_fill', weight: 2 }
  ];

  useEffect(() => {
    if (vocabularies.length > 0 && gameState.currentIndex < vocabularies.length) {
      setupNewQuestion();
    }
  }, [gameState.currentIndex, vocabularies]);

  const getRandomMode = (): GameMode => {
    // Calculate total weight
    const totalWeight = gameModes.reduce((sum, item) => sum + item.weight, 0);
    
    // Generate random number between 0 and total weight
    let random = Math.random() * totalWeight;
    
    // Find the selected mode based on weight
    for (const { mode, weight } of gameModes) {
      random -= weight;
      if (random <= 0) {
        return mode;
      }
    }
    
    // Fallback (should never reach here)
    return gameModes[0].mode;
  };

  const setupNewQuestion = useCallback(async () => {
    let vocab: Vocabulary;
    let mode: GameMode;

    // Check if there are items in review queue first
    if (gameState.reviewQueue.length > 0) {
      const reviewItem = gameState.reviewQueue[0];
      vocab = reviewItem.vocab;
      mode = reviewItem.mode;
      
      // Remove from review queue
      setGameState(prev => ({
        ...prev,
        reviewQueue: prev.reviewQueue.slice(1)
      }));
    } else {
      if (gameState.currentIndex >= vocabularies.length) {
        setGameComplete(true);
        return;
      }
      
      vocab = vocabularies[gameState.currentIndex];
      mode = getRandomMode();
    }

    setCurrentVocab(vocab);
    
    const options = generateOptions(vocab, mode);
    setCurrentOptions(options);
    
    setGameState(prev => ({
      ...prev,
      mode,
      selectedAnswer: '',
      userInput: '',
      showResult: false,
      startTime: Date.now(),
      generatedSentence: null,
      isLoadingSentence: mode === 'context_fill',
      sentenceError: null
    }));

    // Generate sentence for context_fill mode
    if (mode === 'context_fill') {
      try {
        const response = await fetch('/api/vocab/generate-sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabularyId: vocab.id })
        });

        if (response.ok) {
          const data = await response.json();
          setGameState(prev => ({
            ...prev,
            generatedSentence: data.sentenceWithBlank,
            isLoadingSentence: false
          }));
        } else {
          throw new Error('Failed to generate sentence');
        }
      } catch (error) {
        console.error('Error generating sentence:', error);
        setGameState(prev => ({
          ...prev,
          generatedSentence: null,
          isLoadingSentence: false,
          sentenceError: 'Failed to generate sentence'
        }));
      }
    }
  }, [gameState.currentIndex, gameState.reviewQueue, vocabularies]);

  const generateOptions = (vocab: Vocabulary, mode: GameMode): string[] => {
    let correctAnswer = '';
    let wrongAnswers: string[] = [];

    switch (mode) {
      case 'listening':
        correctAnswer = vocab.word;
        wrongAnswers = vocabularies
          .filter(v => v.id !== vocab.id)
          .map(v => v.word)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        break;
        
      case 'translation':
        return []; // No options needed for translation mode
        
      case 'synonym':
        if (vocab.synonyms && vocab.synonyms.length > 0) {
          correctAnswer = vocab.synonyms[0].synonym_text;
          wrongAnswers = vocabularies
            .filter(v => v.id !== vocab.id)
            .flatMap(v => v.synonyms || [])
            .map(s => s.synonym_text)
            .filter(s => s !== correctAnswer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        } else {
          // Fallback to word meanings
          correctAnswer = vocab.meaning;
          wrongAnswers = vocabularies
            .filter(v => v.id !== vocab.id)
            .map(v => v.meaning)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        }
        break;
        
        case 'fill_blank':
        return []; // No options needed for fill blank mode
        
      case 'context_write':
        return []; // No options needed for context write mode
        
      case 'context_fill':
        return []; // No options needed for context fill mode
    }

    return [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  };

  const playAudio = async () => {
    if (currentVocab?.word) {
      setUserInteractionDetected(); // Ensure autoplay restrictions are managed
      await playPronunciation(currentVocab.word, currentVocab.audio_url);
    }
  };

  const handleSubmit = async () => {
    if (!currentVocab) return;
    
    const responseTime = Date.now() - gameState.startTime;
    let userAnswer = '';
    let isCorrect = false;
    let correctAnswer = '';

    switch (gameState.mode) {
      case 'listening':
        userAnswer = gameState.selectedAnswer;
        correctAnswer = currentVocab.word;
        isCorrect = userAnswer === correctAnswer;
        break;
        
      case 'translation':
        userAnswer = gameState.userInput.trim();
        correctAnswer = currentVocab.word;
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        break;
        
      case 'synonym':
        userAnswer = gameState.selectedAnswer;
        if (currentVocab.synonyms && currentVocab.synonyms.length > 0) {
          correctAnswer = currentVocab.synonyms[0].synonym_text;
          isCorrect = currentVocab.synonyms.some(s => s.synonym_text === userAnswer);
        } else {
          correctAnswer = currentVocab.meaning;
          isCorrect = userAnswer === correctAnswer;
        }
        break;
        
      case 'fill_blank':
        userAnswer = gameState.userInput.trim();
        correctAnswer = currentVocab.word;
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        break;
        
      case 'context_write':
        userAnswer = gameState.userInput.trim();
        correctAnswer = currentVocab.word;
        // For context_write, initial validation - will be overridden by AI
        isCorrect = userAnswer.toLowerCase().includes(correctAnswer.toLowerCase());
        break;
        
      case 'context_fill':
        userAnswer = gameState.userInput.trim();
        correctAnswer = currentVocab.word;
        // For context_fill, initial validation - will be overridden by AI
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        break;
    }

    let result: GameResult = {
      vocabularyId: currentVocab.id,
      activityType: gameState.mode,
      isCorrect,
      responseTime,
      userAnswer
    };

    // For AI-enabled modes, get AI feedback and update result
    let aiScore: number | undefined;
    let aiFeedback: string | undefined;
    let aiSuggestions: { improvements: string[]; collocations: string[] } | undefined;
    
    if (gameState.mode === 'context_write' || gameState.mode === 'context_fill') {
      try {
        setGameState(prev => ({ ...prev, isLoadingAI: true, aiError: null }));
        
        const sentenceForAI = gameState.mode === 'context_fill' && gameState.generatedSentence
          ? gameState.generatedSentence.replace('______', userAnswer)
          : userAnswer;
        
        const aiResponse = await fetch('/api/vocab/ai-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vocabularyId: currentVocab.id,
            mode: gameState.mode,
            userSentence: sentenceForAI
          })
        });
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiScore = aiData.score;
          aiFeedback = aiData.feedback;
          aiSuggestions = aiData.suggestions;
          
          // Update isCorrect based on AI score (>= 7 is correct)
          isCorrect = aiScore >= 7;
          
          // Update result with AI data
          result = {
            ...result,
            isCorrect,
            aiScore,
            aiFeedback,
            aiSuggestions
          };
        } else {
          console.error('AI feedback API failed:', aiResponse.status);
          setGameState(prev => ({ ...prev, aiError: 'Failed to get AI feedback' }));
        }
      } catch (error) {
        console.error('Error getting AI feedback:', error);
        setGameState(prev => ({ ...prev, aiError: 'Error getting AI feedback' }));
      } finally {
        setGameState(prev => ({ ...prev, isLoadingAI: false }));
      }
    }

    // Update consecutive incorrect tracking
    const newConsecutiveIncorrectMap = new Map(gameState.consecutiveIncorrectMap);
    if (!isCorrect) {
      const currentCount = newConsecutiveIncorrectMap.get(currentVocab.id) || 0;
      newConsecutiveIncorrectMap.set(currentVocab.id, currentCount + 1);
    } else {
      newConsecutiveIncorrectMap.set(currentVocab.id, 0);
    }

    // Check if we need to pass the lowering flag (when consecutive count reaches 2)
    const consecutiveCount = newConsecutiveIncorrectMap.get(currentVocab.id) || 0;
    const shouldLowerMastery = consecutiveCount === 2;

    // Call the review API
    let masteryChange = 0;
    try {
      const reviewPayload: any = {
        vocabularyId: currentVocab.id,
        isCorrect,
        activityType: gameState.mode,
        responseTimeMs: responseTime,
        userAnswer,
        sessionId: gameState.gameSessionId,
        shouldLowerMastery // Pass the lowering flag only when count==2
      };
      
      // For new modes with AI feedback, pass the score (1-10) for quality mapping
      if (aiScore !== undefined) {
        reviewPayload.score = aiScore;
      }
      
      const apiResponse = await fetch('/api/vocab/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload)
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        masteryChange = apiData.masteryDelta || 0;
      }
    } catch (error) {
      console.error('Error updating vocabulary review:', error);
    }

    // Set the last result for the ResultCard
    setLastResult({
      vocab: currentVocab,
      result,
      correctAnswer,
      masteryChange,
      aiScore,
      aiFeedback,
      aiSuggestions
    });

    setGameState(prev => {
      const newResults = [...prev.results, result];
      let newStreak = isCorrect ? prev.streak + 1 : 0;
      let newScore = prev.score + (isCorrect ? 10 : 0);
      let newReviewQueue = [...prev.reviewQueue];

      // Add to review queue if incorrect (3-10 positions ahead)
      if (!isCorrect) {
        const reviewDistance = Math.floor(Math.random() * 8) + 3; // 3-10 words later
        const reviewItem = { 
          vocab: currentVocab, 
          mode: gameState.mode, 
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
  };

  const nextQuestion = () => {
    if (gameState.reviewQueue.length > 0) {
      setupNewQuestion();
    } else {
      setGameState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1
      }));
    }
  };

  const renderQuestion = () => {
    if (!currentVocab) return null;

    switch (gameState.mode) {
      case 'listening':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-base md:text-lg mb-4" id="listening-instruction">Listen to the pronunciation and choose the correct word:</p>
              <Button
                onClick={playAudio}
                size="lg"
                className="mb-6"
                aria-describedby="listening-instruction"
                aria-label="Play audio pronunciation"
              >
                <Headphones className="h-4 w-4 md:h-6 md:w-6 mr-2" />
                Play Audio
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-labelledby="listening-instruction">
              {currentOptions.map((option, index) => (
                <Button
                  key={index}
                  variant={gameState.selectedAnswer === option ? "default" : "outline"}
                  onClick={() => setGameState(prev => ({ ...prev, selectedAnswer: option }))}
                  className="p-3 md:p-4 h-auto text-sm md:text-base"
                  role="radio"
                  aria-checked={gameState.selectedAnswer === option}
                  aria-label={`Option ${index + 1}: ${option}`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'translation':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-base md:text-lg mb-2" id="translation-instruction">Translate this Vietnamese meaning to English:</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600 mb-4" aria-label={`Vietnamese meaning: ${currentVocab.meaning}`}>{currentVocab.meaning}</p>
            </div>
            <Input
              value={gameState.userInput}
              onChange={(e) => setGameState(prev => ({ ...prev, userInput: e.target.value }))}
              placeholder="Type the English word..."
              className="text-center text-base md:text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              aria-describedby="translation-instruction"
              aria-label="English translation input"
            />
          </div>
        );

      case 'synonym':
        const synonymPrompt = currentVocab.synonyms && currentVocab.synonyms.length > 0 
          ? `Choose a synonym for: ${currentVocab.word}`
          : `Choose the meaning for: ${currentVocab.word}`;
        
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-base md:text-lg mb-4" id="synonym-instruction">{synonymPrompt}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-labelledby="synonym-instruction">
              {currentOptions.map((option, index) => (
                <Button
                  key={index}
                  variant={gameState.selectedAnswer === option ? "default" : "outline"}
                  onClick={() => setGameState(prev => ({ ...prev, selectedAnswer: option }))}
                  className="p-3 md:p-4 h-auto text-sm md:text-base"
                  role="radio"
                  aria-checked={gameState.selectedAnswer === option}
                  aria-label={`Option ${index + 1}: ${option}`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'fill_blank':
        const sentence = currentVocab.example.replace(
          new RegExp(currentVocab.word, 'gi'), 
          '______'
        );
        
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-base md:text-lg mb-2" id="fill-blank-instruction">Fill in the blank:</p>
              <p className="text-lg md:text-xl italic bg-gray-50 dark:bg-gray-800 p-3 md:p-4 rounded-lg" aria-label={`Sentence with blank: ${sentence}`}>
                "{sentence}"
              </p>
            </div>
            
            {/* Hint section with Vietnamese meaning and definition */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-center space-y-2">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">💡 Hints:</p>
                {currentVocab.meaning && (
                  <div className="flex items-center justify-center gap-2">
                    <LanguagesIcon className="h-4 w-4 text-blue-600" />
                    <p className="text-sm md:text-base text-blue-800 dark:text-blue-200 font-medium">
                      Vietnamese: <span className="italic">{currentVocab.meaning}</span>
                    </p>
                  </div>
                )}
                {currentVocab.definition && (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <p className="text-sm md:text-base text-blue-800 dark:text-blue-200">
                      Definition: <span className="italic">{currentVocab.definition}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <Input
              value={gameState.userInput}
              onChange={(e) => setGameState(prev => ({ ...prev, userInput: e.target.value }))}
              placeholder="Type the missing word..."
              className="text-center text-base md:text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              aria-describedby="fill-blank-instruction"
              aria-label="Fill in the blank input"
            />
          </div>
        );

      case 'context_write':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-base md:text-lg mb-2" id="context-write-instruction">Write a sentence using this word:</p>
              <p className="text-xl md:text-2xl font-bold text-green-600 mb-4" aria-label={`Word to use: ${currentVocab.word}`}>{currentVocab.word}</p>
            </div>
            
            {/* Context section with meaning and definition */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-center space-y-2">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">💡 Context:</p>
                {currentVocab.meaning && (
                  <div className="flex items-center justify-center gap-2">
                    <LanguagesIcon className="h-4 w-4 text-green-600" />
                    <p className="text-sm md:text-base text-green-800 dark:text-green-200 font-medium">
                      Vietnamese: <span className="italic">{currentVocab.meaning}</span>
                    </p>
                  </div>
                )}
                {currentVocab.definition && (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <p className="text-sm md:text-base text-green-800 dark:text-green-200">
                      Definition: <span className="italic">{currentVocab.definition}</span>
                    </p>
                  </div>
                )}
                {currentVocab.example && (
                  <div className="text-sm md:text-base text-green-800 dark:text-green-200">
                    <p>Example: <span className="italic">"{currentVocab.example}"</span></p>
                  </div>
                )}
              </div>
            </div>
            
            <Textarea
              value={gameState.userInput}
              onChange={(e) => setGameState(prev => ({ ...prev, userInput: e.target.value }))}
              placeholder="Write your sentence here..."
              className="text-center text-base md:text-lg min-h-20"
              onKeyDown={(e) => e.key === 'Enter' && e.shiftKey === false && handleSubmit()}
              aria-describedby="context-write-instruction"
              aria-label="Sentence writing input"
            />
          </div>
        );

      case 'context_fill':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-base md:text-lg mb-2" id="context-fill-instruction">Complete the sentence with the appropriate word:</p>
              
              {gameState.isLoadingSentence ? (
                <div className="text-lg md:text-xl italic bg-purple-50 dark:bg-purple-800 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span>Generating sentence...</span>
                  </div>
                </div>
              ) : gameState.sentenceError ? (
                <div className="text-lg md:text-xl italic bg-red-50 dark:bg-red-800 p-3 md:p-4 rounded-lg text-red-700 dark:text-red-200">
                  Error: {gameState.sentenceError}
                  <br />
                  <small>Fallback: Complete the sentence with "{currentVocab.word}"</small>
                </div>
              ) : gameState.generatedSentence ? (
                <p className="text-lg md:text-xl italic bg-purple-50 dark:bg-purple-800 p-3 md:p-4 rounded-lg" aria-label={`Context sentence with blank: ${gameState.generatedSentence}`}>
                  "{gameState.generatedSentence}"
                </p>
              ) : (
                <p className="text-lg md:text-xl italic bg-purple-50 dark:bg-purple-800 p-3 md:p-4 rounded-lg">
                  "Fill in the blank with the word: {currentVocab.word}"
                </p>
              )}
            </div>
            
            {/* Enhanced hints section */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-center space-y-2">
                <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">💡 Contextual Hints:</p>
                {currentVocab.meaning && (
                  <div className="flex items-center justify-center gap-2">
                    <LanguagesIcon className="h-4 w-4 text-purple-600" />
                    <p className="text-sm md:text-base text-purple-800 dark:text-purple-200 font-medium">
                      Vietnamese: <span className="italic">{currentVocab.meaning}</span>
                    </p>
                  </div>
                )}
                {currentVocab.definition && (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <p className="text-sm md:text-base text-purple-800 dark:text-purple-200">
                      Definition: <span className="italic">{currentVocab.definition}</span>
                    </p>
                  </div>
                )}
                {currentVocab.pronunciation_ipa && (
                  <div className="text-sm md:text-base text-purple-800 dark:text-purple-200">
                    <p>Pronunciation: <span className="italic">{currentVocab.pronunciation_ipa}</span></p>
                  </div>
                )}
              </div>
            </div>
            
            <Input
              value={gameState.userInput}
              onChange={(e) => setGameState(prev => ({ ...prev, userInput: e.target.value }))}
              placeholder="Type the missing word..."
              className="text-center text-base md:text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              aria-describedby="context-fill-instruction"
              aria-label="Context fill input"
              disabled={gameState.isLoadingSentence}
            />
          </div>
        );

      default:
        return null;
    }
  };


  if (gameComplete) {
    return (
      <QuizResultsDetail 
        vocabularies={vocabularies}
        results={gameState.results}
        onRestart={() => {
          setGameState({
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
            aiFeedback: null,
            isLoadingAI: false,
            aiError: null,
            generatedSentence: null,
            isLoadingSentence: false,
            sentenceError: null
          });
          setGameComplete(false);
        }}
        onContinue={() => onComplete(gameState.results)}
      />
    );
  }

  const progress = ((gameState.currentIndex + gameState.results.length) / (vocabularies.length + gameState.reviewQueue.length)) * 100;

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Progress Header */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-2">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <Badge variant="outline" className="text-xs md:text-sm">
                {gameState.mode.replace('_', ' ').toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1 md:gap-2" role="status" aria-label={`Current streak: ${gameState.streak}`}>
                <Zap className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
                <span className="text-xs md:text-sm">Streak: {gameState.streak}</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2" role="status" aria-label={`Current score: ${gameState.score}`}>
                <Target className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                <span className="text-xs md:text-sm">Score: {gameState.score}</span>
              </div>
              {isSaving && (
                <div className="flex items-center gap-1 md:gap-2" role="status" aria-label="Saving progress">
                  <Save className="h-3 w-3 md:h-4 md:w-4 text-green-500 animate-pulse" />
                  <span className="text-xs md:text-sm text-green-600">Saving...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs md:text-sm text-gray-600" role="status" aria-label={`Progress: question ${gameState.currentIndex + 1} of ${vocabularies.length}`}>
                {gameState.currentIndex + 1} / {vocabularies.length}
                {gameState.reviewQueue.length > 0 && ` (+${gameState.reviewQueue.length} review)`}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={saveProgress}
                disabled={isSaving}
                className="h-6 px-2 text-xs"
                title="Save progress manually"
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-1.5 md:h-2" aria-label={`Study progress: ${Math.round(progress)}% complete`} />
        </CardContent>
      </Card>

      {/* Question Card */}
      {!gameState.showResult && (
        <Card>
          <CardContent className="p-6">
            {renderQuestion()}
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleSubmit}
                disabled={
                  (gameState.mode === 'listening' || gameState.mode === 'synonym') && !gameState.selectedAnswer ||
                  (gameState.mode === 'translation' || gameState.mode === 'fill_blank' || gameState.mode === 'context_write' || gameState.mode === 'context_fill') && !gameState.userInput.trim() ||
                  gameState.mode === 'context_fill' && gameState.isLoadingSentence ||
                  gameState.isLoadingAI
                }
                size="lg"
              >
                {gameState.isLoadingAI ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Getting AI Feedback...</span>
                  </div>
                ) : (
                  'Submit Answer'
                )}
              </Button>
            </div>
            
            {/* AI Error Display */}
            {gameState.aiError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                {gameState.aiError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result Card */}
      {gameState.showResult && lastResult && (
        <ResultCard
          vocabulary={lastResult.vocab}
          isCorrect={lastResult.result.isCorrect}
          userAnswer={lastResult.result.userAnswer}
          correctAnswer={lastResult.correctAnswer}
          activityType={lastResult.result.activityType}
          responseTime={lastResult.result.responseTime}
          masteryChange={lastResult.masteryChange}
          aiScore={lastResult.aiScore}
          aiFeedback={lastResult.aiFeedback}
          aiSuggestions={lastResult.aiSuggestions}
          onContinue={nextQuestion}
        />
      )}
    </div>
  );
}
