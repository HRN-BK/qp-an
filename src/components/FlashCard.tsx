"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, Eye, EyeOff } from "lucide-react";
import { playPronunciation, setUserInteractionDetected } from "@/lib/audio-utils";

interface FlashCardProps {
  word: string;
  meaning: string;
  definition?: string;
  pronunciation?: string;
  part_of_speech?: string;
difficulty?: string;
  onRate: (rating: number) => void;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}

export function FlashCard({
  word,
  meaning,
  definition,
  pronunciation,
  part_of_speech,
  difficulty,
  onRate,
  showAnswer,
  onToggleAnswer,
}: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    onToggleAnswer();
  };

  const handlePlayPronunciation = () => {
    setUserInteractionDetected(); // Ensure autoplay restrictions are managed
    playPronunciation(word);
  };

  const getRatingButton = (rating: number, label: string, color: string) => (
    <Button
      onClick={() => onRate(rating)}
      variant="outline"
      className={`flex-1 ${color}`}
      disabled={!showAnswer}
    >
      {label}
    </Button>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className={`h-96 cursor-pointer transition-all duration-300 ${isFlipped ? 'transform' : ''}`}>
        <CardContent className="p-8 h-full flex flex-col justify-between">
          {!showAnswer ? (
            // Front of card - Question
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
              <div className="space-y-2">
                {part_of_speech && (
                  <Badge variant="outline" className="mb-2">
                    {part_of_speech}
                  </Badge>
                )}
                <h2 className="text-3xl font-bold text-primary">
                  {word}
                </h2>
                {pronunciation && (
                  <p className="text-sm text-muted-foreground">
                    /{pronunciation}/
                  </p>
                )}
                {difficulty && (
                  <Badge 
                    variant={difficulty === 'C1' || difficulty === 'C2' ? "destructive" : "secondary"}
                    className="mt-2"
                  >
                    {difficulty}
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                onClick={handlePlayPronunciation}
                  variant="outline"
                  size="sm"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-muted-foreground text-sm mt-4">
                What does this word mean?
              </p>
            </div>
          ) : (
            // Back of card - Answer
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-primary">
                  {word}
                </h2>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium text-green-700 dark:text-green-400">
                    {meaning}
                  </p>
                  
                  {definition && (
                    <p className="text-sm text-muted-foreground italic">
                      &quot;{definition}&quot;
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6">
            {!showAnswer ? (
              <Button 
                onClick={handleFlip}
                className="w-full"
                variant="default"
              >
                <Eye className="h-4 w-4 mr-2" />
                Show Answer
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleFlip}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Answer
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {getRatingButton(1, "Hard", "border-red-500 hover:bg-red-50")}
                  {getRatingButton(2, "Good", "border-yellow-500 hover:bg-yellow-50")}
                  {getRatingButton(3, "Easy", "border-green-500 hover:bg-green-50")}
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Rate your confidence to determine when to review again
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
