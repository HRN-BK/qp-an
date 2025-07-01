"use client";

import { useState, useEffect } from "react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { FlashCard } from "@/components/FlashCard";
import StudyGame from "@/components/StudyGame";
import { CompletionCard } from "@/components/CompletionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  RotateCcw, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock,
  Zap,
  Gamepad2,
  BookOpen,
  Volume2
} from "lucide-react";

// Convert difficulty number to CEFR level
const convertToCEFR = (difficulty?: number): string => {
  if (!difficulty) return 'A1';
  switch (difficulty) {
    case 1: return 'A1';
    case 2: return 'A2';
    case 3: return 'B1';
    case 4: return 'B2';
    case 5: return 'C1';
    default: return 'A1';
  }
};

interface Vocabulary {
  id: number;
  word: string;
  meaning: string;
  definition?: string;
  pronunciation?: string;
  part_of_speech?: string;
  difficulty?: number;
  next_review?: string;
  review_count: number;
  ease_factor: number;
  cefr_level?: string;
  mastery_level?: number;
  pronunciation_ipa?: string;
  audio_url?: string;
  example?: string;
  synonyms?: Array<{ synonym_text: string }>;
  antonyms?: Array<{ antonym_text: string }>;
}

interface GameResult {
  vocabularyId: number;
  activityType: 'listening' | 'translation' | 'synonym' | 'fill_blank';
  isCorrect: boolean;
  responseTime: number;
  userAnswer: string;
}

type StudyMode = 'classic' | 'game';

export default function FlashCardsPage() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studyMode, setStudyMode] = useState<StudyMode>('classic');
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    total: 0
  });

  useEffect(() => {
    fetchDueVocabularies();
  }, []);

  const fetchDueVocabularies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/vocab/due");
      if (!response.ok) {
        throw new Error("Failed to fetch vocabularies");
      }
      const data = await response.json();
      // Convert id to number and add missing fields
      const processedVocabs = (data.vocabularies || []).map((vocab: any) => ({
        ...vocab,
        id: parseInt(vocab.id),
        cefr_level: vocab.cefr_level || convertToCEFR(vocab.difficulty),
        mastery_level: vocab.mastery_level || 0,
        example: vocab.example || `This is an example sentence with ${vocab.word}.`
      }));
      setVocabularies(processedVocabs);
      setSessionStats(prev => ({ ...prev, total: processedVocabs.length }));
    } catch (error) {
      console.error("Error fetching vocabularies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!vocabularies[currentIndex]) return;

    const vocabulary = vocabularies[currentIndex];
    
    try {
      const response = await fetch("/api/vocab/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vocabularyId: vocabulary.id,
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update review");
      }

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (rating >= 2 ? 1 : 0)
      }));

      // Move to next card or finish session
      if (currentIndex < vocabularies.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Session complete
        alert(`Session complete! Reviewed ${sessionStats.reviewed + 1} cards.`);
        await fetchDueVocabularies(); // Refresh the list
        setCurrentIndex(0);
        setShowAnswer(false);
        setSessionStats({ reviewed: 0, correct: 0, total: vocabularies.length });
      }
    } catch (error) {
      console.error("Error updating review:", error);
      alert("Failed to update review. Please try again.");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < vocabularies.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionStats({ reviewed: 0, correct: 0, total: vocabularies.length });
  };

  const handleGameComplete = async (results: GameResult[]) => {
    // Update study session stats
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Update learning session
      const sessionResponse = await fetch('/api/stats/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_date: today,
          words_studied: results.length,
          correct_answers: results.filter(r => r.isCorrect).length,
          total_answers: results.length
        })
      });

      // Update individual vocabulary records
      for (const result of results) {
        const vocab = vocabularies.find(v => v.id === result.vocabularyId);
        if (vocab) {
          let newMasteryLevel = vocab.mastery_level || 0;
          
          // Update mastery level based on performance
          if (result.isCorrect) {
            newMasteryLevel = Math.min(5, newMasteryLevel + 1);
          } else {
            newMasteryLevel = Math.max(0, newMasteryLevel - 1);
          }

          // Update vocabulary
          await fetch('/api/vocab/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vocabularyId: result.vocabularyId,
              rating: result.isCorrect ? 3 : 1, // Map to classic rating system
              masteryLevel: newMasteryLevel
            })
          });

          // Record study activity
          await fetch('/api/stats/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vocabulary_id: result.vocabularyId,
              activity_type: result.activityType,
              is_correct: result.isCorrect,
              response_time: result.responseTime,
              user_answer: result.userAnswer
            })
          });
        }
      }

      // Refresh vocabularies and return to mode selection
      await fetchDueVocabularies();
      setStudyMode('classic');
      setCurrentIndex(0);
      setShowAnswer(false);
      
    } catch (error) {
      console.error('Error updating game results:', error);
    }
  };

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Flash Cards</h1>
            <p className="text-muted-foreground">Loading your review session...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (vocabularies.length === 0) {
    return (
      <ProtectedLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Flash Cards</h1>
            <p className="text-muted-foreground">
              Spaced repetition system for vocabulary review
            </p>
          </div>

          <CompletionCard onRefresh={fetchDueVocabularies} />
        </div>
      </ProtectedLayout>
    );
  }

  const currentVocab = vocabularies[currentIndex];
  const progress = sessionStats.total > 0 ? ((currentIndex + 1) / sessionStats.total) * 100 : 0;

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Flash Cards</h1>
          <p className="text-muted-foreground">
            Spaced repetition system for vocabulary review
          </p>
        </div>

        {/* Study Mode Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={studyMode === 'classic' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStudyMode('classic')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Classic Mode
                </Button>
                <Button
                  variant={studyMode === 'game' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStudyMode('game')}
                  className="flex items-center gap-2"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Game Mode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {studyMode === 'game' ? (
          /* Game Mode */
          <StudyGame 
            vocabularies={vocabularies}
            onGameComplete={handleGameComplete}
          />
        ) : (
          /* Classic Mode */
          <>
            {/* Progress and Stats */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">
                      {currentIndex + 1} / {vocabularies.length}
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {sessionStats.reviewed} reviewed
                    </Badge>
                    {sessionStats.reviewed > 0 && (
                      <Badge variant="default">
                        <Zap className="h-3 w-3 mr-1" />
                        {Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}% accuracy
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={resetSession}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restart
                  </Button>
                </div>
                <Progress value={progress} className="w-full" />
              </CardContent>
            </Card>

            {/* Flash Card */}
            <div className="flex justify-center">
              <FlashCard
                word={currentVocab.word}
                meaning={currentVocab.meaning}
                definition={currentVocab.definition}
                pronunciation={currentVocab.pronunciation}
                part_of_speech={currentVocab.part_of_speech}
                difficulty={convertToCEFR(currentVocab.difficulty)}
                onRate={handleRate}
                showAnswer={showAnswer}
                onToggleAnswer={toggleAnswer}
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={handlePrevious}
                variant="outline"
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                variant="outline"
                disabled={currentIndex === vocabularies.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How it works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Spaced Repetition System:</strong></p>
                  <p>• <strong>Hard:</strong> Review again in 1 day</p>
                  <p>• <strong>Good:</strong> Review again in 3 days</p>
                  <p>• <strong>Easy:</strong> Review again in 1 week</p>
                  <p className="mt-3">
                    The algorithm adapts to your performance, showing difficult words more frequently
                    and easy words less often to optimize your learning.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
