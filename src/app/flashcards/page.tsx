"use client";

import { useState, useEffect } from "react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { FlashCard } from "@/components/FlashCard";
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
  Volume2,
  Home
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
  id: string | number; // Support both UUID and integer IDs
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

export default function FlashCardsPage() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
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
      // Don't convert ID - keep original format (UUID or integer)
      const processedVocabs = (data.vocabularies || []).map((vocab: any) => ({
        ...vocab,
        cefr_level: vocab.cefr_level || convertToCEFR(vocab.difficulty),
        mastery_level: vocab.mastery_level || 0,
        example: vocab.example || `This is an example sentence with ${vocab.word}.`
      }));
      
      console.log('First vocab ID:', processedVocabs[0]?.id, 'Type:', typeof processedVocabs[0]?.id);
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
      const response = await fetch("/api/vocab/simple-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vocabularyId: vocabulary.id,
          rating
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update review");
      }

      const result = await response.json();
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (rating >= 2 ? 1 : 0)
      }));

      // Show feedback
      const ratingText = rating === 1 ? "Hard" : rating === 2 ? "Good" : "Easy";
      const message = `Rated as ${ratingText}! Next review in ${result.daysUntilReview} days.`;
      
      // Move to next card or finish session
      if (currentIndex < vocabularies.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Session complete
        alert(`Session complete! You reviewed ${sessionStats.reviewed + 1} cards.`);
        setCurrentIndex(0);
        setShowAnswer(false);
        setSessionStats({ reviewed: 0, correct: 0, total: vocabularies.length });
        await fetchDueVocabularies(); // Refresh the list
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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Flash Cards</h1>
          <p className="text-muted-foreground">
            Spaced repetition system for vocabulary review
          </p>
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  Card {currentIndex + 1} of {vocabularies.length}
                </Badge>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Reviewed: {sessionStats.reviewed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Correct: {sessionStats.correct}</span>
                </div>
              </div>
              <Button onClick={resetSession} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Main flashcard */}
        <FlashCard
          word={currentVocab.word}
          meaning={currentVocab.meaning}
          definition={currentVocab.definition}
          pronunciation={currentVocab.pronunciation || currentVocab.pronunciation_ipa}
          part_of_speech={currentVocab.part_of_speech}
          difficulty={currentVocab.cefr_level || convertToCEFR(currentVocab.difficulty)}
          onRate={handleRate}
          showAnswer={showAnswer}
          onToggleAnswer={toggleAnswer}
        />

        {/* Navigation controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Mastery Level: {currentVocab.mastery_level || 0}/5
                </Badge>
                {currentVocab.next_review && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    Next: {new Date(currentVocab.next_review).toLocaleDateString()}
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={handleNext}
                disabled={currentIndex === vocabularies.length - 1}
                variant="outline"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-center gap-3">
              <Button onClick={() => window.location.href = '/'} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button onClick={() => window.location.href = '/vocabulary'} variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Vocabulary List
              </Button>
              <Button onClick={fetchDueVocabularies} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
