'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Volume2, Check, X, RotateCcw, Zap, Target, Trophy, BookOpen, Eye, Headphones, LanguagesIcon, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { playPronunciation, setUserInteractionDetected } from '@/lib/audio-utils';

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
  activityType: 'listening' | 'translation' | 'synonym' | 'fill_blank';
  isCorrect: boolean;
  responseTime: number;
  userAnswer: string;
}

type GameMode = 'listening' | 'translation' | 'synonym' | 'fill_blank';

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
}

import { ResultCard } from './ResultCard';

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
    gameSessionId: Math.random().toString(36).substring(7)
  });

  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [currentVocab, setCurrentVocab] = useState<Vocabulary | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [lastResult, setLastResult] = useState<{
    vocab: Vocabulary;
    result: GameResult;
    correctAnswer: string;
    masteryChange: number;
  } | null>(null);

  // Game modes with weights for random selection
  const gameModes: GameMode[] = ['listening', 'translation', 'synonym', 'fill_blank'];

  useEffect(() => {
    if (vocabularies.length > 0 && gameState.currentIndex < vocabularies.length) {
      setupNewQuestion();
    }
  }, [gameState.currentIndex, vocabularies]);

  const getRandomMode = (): GameMode => {
    return gameModes[Math.floor(Math.random() * gameModes.length)];
  };

  const setupNewQuestion = useCallback(() => {
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
      startTime: Date.now()
    }));
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
    }

    const result: GameResult = {
      vocabularyId: currentVocab.id,
      activityType: gameState.mode,
      isCorrect,
      responseTime,
      userAnswer
    };

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
      const apiResponse = await fetch('/api/vocab/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: currentVocab.id,
          isCorrect,
          activityType: gameState.mode,
          responseTimeMs: responseTime,
          userAnswer,
          sessionId: gameState.gameSessionId,
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

    // Set the last result for the ResultCard
    setLastResult({
      vocab: currentVocab,
      result,
      correctAnswer,
      masteryChange
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

      default:
        return null;
    }
  };


  if (gameComplete) {
    const accuracy = gameState.results.length > 0 
      ? (gameState.results.filter(r => r.isCorrect).length / gameState.results.length) * 100 
      : 0;

    return (
      <Card className="text-center p-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Study Session Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{gameState.score}</div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{accuracy.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{Math.max(...gameState.results.map((_, i) => gameState.results.slice(0, i + 1).reverse().findIndex(r => !r.isCorrect) === -1 ? i + 1 : gameState.results.slice(0, i + 1).reverse().findIndex(r => !r.isCorrect)))}</div>
              <div className="text-sm text-gray-600">Best Streak</div>
            </div>
          </div>
          
          <Button 
            onClick={() => onComplete(gameState.results)}
            size="lg"
            className="w-full"
          >
            Finish Session
          </Button>
        </CardContent>
      </Card>
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
            </div>
            <div className="text-xs md:text-sm text-gray-600" role="status" aria-label={`Progress: question ${gameState.currentIndex + 1} of ${vocabularies.length}`}>
              {gameState.currentIndex + 1} / {vocabularies.length}
              {gameState.reviewQueue.length > 0 && ` (+${gameState.reviewQueue.length} review)`}
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
                  (gameState.mode === 'translation' || gameState.mode === 'fill_blank') && !gameState.userInput.trim()
                }
                size="lg"
              >
                Submit Answer
              </Button>
            </div>
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
          onContinue={nextQuestion}
        />
      )}
    </div>
  );
}
