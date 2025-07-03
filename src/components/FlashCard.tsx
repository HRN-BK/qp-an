"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, Eye, EyeOff, Heart, Smile, Frown } from "lucide-react";
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
  const handlePlayPronunciation = () => {
    setUserInteractionDetected();
    playPronunciation(word);
  };

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'A1': return 'bg-green-100 text-green-800 border-green-200';
      case 'A2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'B1': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'B2': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'C1': return 'bg-red-100 text-red-800 border-red-200';
      case 'C2': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="h-[500px] transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-8 h-full flex flex-col">
          {!showAnswer ? (
            /* Question Side */
            <>
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
                <div className="space-y-4">
                  {/* Word and badges */}
                  <div className="space-y-3">
                    {part_of_speech && (
                      <Badge variant="outline" className="text-xs">
                        {part_of_speech}
                      </Badge>
                    )}
                    
                    <h1 className="text-4xl font-bold text-primary tracking-wide">
                      {word}
                    </h1>
                    
                    {pronunciation && (
                      <p className="text-sm text-muted-foreground font-mono">
                        /{pronunciation}/
                      </p>
                    )}
                    
                    {difficulty && (
                      <Badge className={getDifficultyColor(difficulty)}>
                        {difficulty} Level
                      </Badge>
                    )}
                  </div>
                  
                  {/* Audio button */}
                  <Button
                    onClick={handlePlayPronunciation}
                    variant="outline"
                    size="lg"
                    className="mt-6"
                  >
                    <Volume2 className="h-5 w-5 mr-2" />
                    Listen
                  </Button>
                </div>
                
                <div className="text-center mt-8">
                  <p className="text-lg text-muted-foreground mb-2">
                    🤔 What does this word mean?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Think about it, then reveal the answer
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={onToggleAnswer}
                size="lg"
                className="w-full mt-6"
              >
                <Eye className="h-5 w-5 mr-2" />
                Show Answer
              </Button>
            </>
          ) : (
            /* Answer Side */
            <>
              <div className="flex-1 flex flex-col justify-center space-y-6">
                {/* Word header */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-primary">
                    {word}
                  </h2>
                  {pronunciation && (
                    <p className="text-sm text-muted-foreground font-mono">
                      /{pronunciation}/
                    </p>
                  )}
                </div>
                
                {/* Meaning and definition */}
                <div className="space-y-4 text-center">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                    <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                      {meaning}
                    </p>
                  </div>
                  
                  {definition && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-blue-800 dark:text-blue-200 italic">
                        "{definition}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Rating section */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium mb-3">How well did you know this word?</p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => onRate(1)}
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    <Frown className="h-6 w-6 text-red-500 mb-1" />
                    <span className="text-sm font-medium">Hard</span>
                    <span className="text-xs text-muted-foreground">Didn't know</span>
                  </Button>
                  
                  <Button
                    onClick={() => onRate(2)}
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300"
                  >
                    <Smile className="h-6 w-6 text-yellow-500 mb-1" />
                    <span className="text-sm font-medium">Good</span>
                    <span className="text-xs text-muted-foreground">Took time</span>
                  </Button>
                  
                  <Button
                    onClick={() => onRate(3)}
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto border-green-200 hover:bg-green-50 hover:border-green-300"
                  >
                    <Heart className="h-6 w-6 text-green-500 mb-1" />
                    <span className="text-sm font-medium">Easy</span>
                    <span className="text-xs text-muted-foreground">Knew it!</span>
                  </Button>
                </div>
                
                <Button 
                  onClick={onToggleAnswer}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Answer
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
