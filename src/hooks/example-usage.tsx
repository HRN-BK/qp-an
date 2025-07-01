'use client';

import React from 'react';
import { useGameSession, Vocabulary, GameMode } from './useGameSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Example vocabularies for demonstration
const sampleVocabularies: Vocabulary[] = [
  {
    id: 1,
    word: 'example',
    meaning: 'ví dụ',
    definition: 'a thing characteristic of its kind',
    example: 'This is an example sentence.',
    cefr_level: 'B1',
    mastery_level: 1,
    synonyms: [{ synonym_text: 'instance' }, { synonym_text: 'sample' }]
  },
  {
    id: 2,
    word: 'demonstrate',
    meaning: 'chứng minh',
    definition: 'clearly show the existence or truth of something',
    example: 'Let me demonstrate how this works.',
    cefr_level: 'B2',
    mastery_level: 2,
    synonyms: [{ synonym_text: 'show' }, { synonym_text: 'prove' }]
  }
];

interface GameSessionExampleProps {
  vocabularies?: Vocabulary[];
}

export function GameSessionExample({ vocabularies = sampleVocabularies }: GameSessionExampleProps) {
  const { state, actions } = useGameSession(vocabularies.length);
  
  // Get current vocabulary (either from main list or review queue)
  const getCurrentVocab = (): Vocabulary | null => {
    if (state.reviewQueue.length > 0) {
      return state.reviewQueue[0].vocab;
    }
    if (state.currentIndex < vocabularies.length) {
      return vocabularies[state.currentIndex];
    }
    return null;
  };

  const currentVocab = getCurrentVocab();

  // Generate options for multiple choice questions
  const generateOptions = (vocab: Vocabulary, mode: GameMode): string[] => {
    if (mode === 'translation' || mode === 'fill_blank') {
      return []; // No options for text input modes
    }

    let correctAnswer = '';
    let wrongAnswers: string[] = [];

    switch (mode) {
      case 'listening':
        correctAnswer = vocab.word;
        wrongAnswers = vocabularies
          .filter(v => v.id !== vocab.id)
          .map(v => v.word)
          .slice(0, 3);
        break;
      case 'synonym':
        if (vocab.synonyms && vocab.synonyms.length > 0) {
          correctAnswer = vocab.synonyms[0].synonym_text;
          wrongAnswers = vocabularies
            .filter(v => v.id !== vocab.id)
            .flatMap(v => v.synonyms || [])
            .map(s => s.synonym_text)
            .slice(0, 3);
        } else {
          correctAnswer = vocab.meaning;
          wrongAnswers = vocabularies
            .filter(v => v.id !== vocab.id)
            .map(v => v.meaning)
            .slice(0, 3);
        }
        break;
    }

    return [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  };

  const handleSubmit = async () => {
    if (!currentVocab) return;

    const answer = state.selectedAnswer || state.userInput;
    if (!answer.trim()) return;

    try {
      const result = await actions.submit(answer, currentVocab, state.mode);
      console.log('Submission result:', result);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleNext = () => {
    actions.next();
    
    // Set up next question
    if (!state.isComplete) {
      const nextVocab = getCurrentVocab();
      if (nextVocab) {
        // Randomly select a game mode for the next question
        const modes: GameMode[] = ['listening', 'translation', 'synonym', 'fill_blank'];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        actions.setMode(randomMode);
        actions.setStartTime(Date.now());
      }
    }
  };

  const handleOptionSelect = (option: string) => {
    actions.setSelectedAnswer(option);
  };

  const handleInputChange = (value: string) => {
    actions.setUserInput(value);
  };

  const renderQuestion = () => {
    if (!currentVocab) return null;

    switch (state.mode) {
      case 'listening':
        const listeningOptions = generateOptions(currentVocab, 'listening');
        return (
          <div className="space-y-4">
            <p className="text-lg">Listen and select the correct word:</p>
            <Button 
              onClick={() => console.log('Playing audio for:', currentVocab.word)}
              className="mb-4"
            >
              🎵 Play Audio
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {listeningOptions.map((option, index) => (
                <Button
                  key={index}
                  variant={state.selectedAnswer === option ? "default" : "outline"}
                  onClick={() => handleOptionSelect(option)}
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
            <p className="text-lg">Translate this Vietnamese meaning to English:</p>
            <p className="text-xl font-bold text-blue-600">{currentVocab.meaning}</p>
            <Input
              value={state.userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type the English word..."
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        );

      case 'synonym':
        const synonymOptions = generateOptions(currentVocab, 'synonym');
        const synonymPrompt = currentVocab.synonyms && currentVocab.synonyms.length > 0 
          ? `Choose a synonym for: ${currentVocab.word}`
          : `Choose the meaning for: ${currentVocab.word}`;
        
        return (
          <div className="space-y-4">
            <p className="text-lg">{synonymPrompt}</p>
            <div className="grid grid-cols-2 gap-2">
              {synonymOptions.map((option, index) => (
                <Button
                  key={index}
                  variant={state.selectedAnswer === option ? "default" : "outline"}
                  onClick={() => handleOptionSelect(option)}
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
            <p className="text-lg">Fill in the blank:</p>
            <p className="text-lg italic bg-gray-50 p-4 rounded">"{sentence}"</p>
            <Input
              value={state.userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type the missing word..."
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (state.isComplete) {
    const accuracy = state.results.length > 0 
      ? (state.results.filter(r => r.isCorrect).length / state.results.length) * 100 
      : 0;

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">🏆 Session Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{state.score}</div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{accuracy.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{Math.max(...state.results.map((_, i) => {
                return state.results.slice(0, i + 1).reverse().findIndex(r => !r.isCorrect) === -1 
                  ? i + 1 
                  : state.results.slice(0, i + 1).reverse().findIndex(r => !r.isCorrect);
              }))}</div>
              <div className="text-sm text-gray-600">Best Streak</div>
            </div>
          </div>
          <Button onClick={actions.reset} className="w-full">
            Start New Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {state.mode.replace('_', ' ').toUpperCase()}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm">⚡ Streak: {state.streak}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">🎯 Score: {state.score}</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {state.currentIndex + 1} / {vocabularies.length}
              {state.reviewQueue.length > 0 && ` (+${state.reviewQueue.length} review)`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      {!state.showResult && (
        <Card>
          <CardContent className="p-6">
            {renderQuestion()}
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleSubmit}
                disabled={
                  (state.mode === 'listening' || state.mode === 'synonym') && !state.selectedAnswer ||
                  (state.mode === 'translation' || state.mode === 'fill_blank') && !state.userInput.trim()
                }
                size="lg"
              >
                Submit Answer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Display */}
      {state.showResult && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="text-2xl">
                {state.results[state.results.length - 1]?.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </div>
              <div className="space-y-2">
                <p><strong>Your answer:</strong> {state.results[state.results.length - 1]?.userAnswer}</p>
                {currentVocab && (
                  <div>
                    <p><strong>Word:</strong> {currentVocab.word}</p>
                    <p><strong>Meaning:</strong> {currentVocab.meaning}</p>
                    <p><strong>Definition:</strong> {currentVocab.definition}</p>
                    <p><strong>Example:</strong> {currentVocab.example}</p>
                  </div>
                )}
              </div>
              <Button onClick={handleNext} size="lg">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <p>Review Queue: {state.reviewQueue.length} items</p>
          <p>Session ID: {state.gameSessionId}</p>
          <p>Consecutive Incorrect Map: {JSON.stringify(Array.from(state.consecutiveIncorrectMap.entries()))}</p>
        </CardContent>
      </Card>
    </div>
  );
}
