'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Check, X, Star, TrendingUp, TrendingDown } from 'lucide-react';
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

interface ResultCardProps {
  vocabulary: Vocabulary;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  activityType: 'listening' | 'translation' | 'synonym' | 'fill_blank' | 'context_write' | 'context_fill';
  responseTime: number;
  masteryChange?: number;
  aiScore?: number;
  aiFeedback?: string;
  aiSuggestions?: {
    improvements: string[];
    collocations: string[];
  };
  onContinue: () => void;
}

export function ResultCard({
  vocabulary,
  isCorrect,
  userAnswer,
  correctAnswer,
  activityType,
  responseTime,
  masteryChange = 0,
  aiScore,
  aiFeedback,
  aiSuggestions,
  onContinue
}: ResultCardProps) {
  const playAudio = async () => {
    setUserInteractionDetected(); // Ensure autoplay restrictions are managed
    await playPronunciation(vocabulary.word, vocabulary.audio_url);
  };

  const getMasteryLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 text-gray-700';
      case 1: return 'bg-red-100 text-red-700';
      case 2: return 'bg-orange-100 text-orange-700';
      case 3: return 'bg-yellow-100 text-yellow-700';
      case 4: return 'bg-blue-100 text-blue-700';
      case 5: return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMasteryLevelName = (level: number) => {
    switch (level) {
      case 0: return 'New';
      case 1: return 'Learning';
      case 2: return 'Young';
      case 3: return 'Mature';
      case 4: return 'Proficient';
      case 5: return 'Mastered';
      default: return 'Unknown';
    }
  };

  const getActivityTypeName = (type: string) => {
    switch (type) {
      case 'listening': return 'Listening';
      case 'translation': return 'Translation';
      case 'synonym': return 'Synonym';
      case 'fill_blank': return 'Fill in the Blank';
      case 'context_write': return 'Context Writing';
      case 'context_fill': return 'Context Fill';
      default: return type;
    }
  };

  return (
    <Card className={`border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} transition-all duration-300`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center justify-between ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
          <div className="flex items-center gap-2">
            {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs">
              {getActivityTypeName(activityType)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {(responseTime / 1000).toFixed(1)}s
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Answer Comparison */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Your Answer:</p>
              <p className={`text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {userAnswer || '(No answer)'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Correct Answer:</p>
              <p className="text-lg font-semibold text-green-600">
                {correctAnswer}
              </p>
            </div>
          </div>
        </div>

        {/* Vocabulary Details */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{vocabulary.word}</h3>
              {vocabulary.pronunciation_ipa && (
                <p className="text-sm text-gray-500 mt-1">/{vocabulary.pronunciation_ipa}/</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={playAudio}
                className="text-blue-600 hover:text-blue-700"
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Listen
              </Button>
              <Badge className={getMasteryLevelColor(vocabulary.mastery_level)}>
                {getMasteryLevelName(vocabulary.mastery_level)}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Vietnamese Meaning:</p>
              <p className="text-lg text-blue-600 font-medium">{vocabulary.meaning}</p>
            </div>

            {vocabulary.definition && (
              <div>
                <p className="text-sm font-medium text-gray-600">Definition:</p>
                <p className="text-gray-700">{vocabulary.definition}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-600">Example:</p>
              <p className="text-gray-700 italic">"{vocabulary.example}"</p>
            </div>

            {vocabulary.synonyms && vocabulary.synonyms.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Synonyms:</p>
                <div className="flex flex-wrap gap-2">
                  {vocabulary.synonyms.map((syn, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {syn.synonym_text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {vocabulary.antonyms && vocabulary.antonyms.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Antonyms:</p>
                <div className="flex flex-wrap gap-2">
                  {vocabulary.antonyms.map((ant, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {ant.antonym_text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mastery Change Indicator */}
        {masteryChange !== 0 && (
          <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
            masteryChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {masteryChange > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="font-medium">
              Mastery level {masteryChange > 0 ? 'increased' : 'decreased'} by {Math.abs(masteryChange)}
            </span>
          </div>
        )}

        {/* AI Feedback Section for Context Modes */}
        {(activityType === 'context_write' || activityType === 'context_fill') && aiScore !== undefined && (
          <div className="bg-white rounded-lg p-4 border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">AI Feedback</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={aiScore >= 7 ? "default" : "destructive"} className="text-sm">
                    Score: {aiScore}/10
                  </Badge>
                </div>
              </div>
              
              {aiFeedback && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Detailed Feedback:</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{aiFeedback}</p>
                </div>
              )}
              
              {aiSuggestions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiSuggestions.improvements && aiSuggestions.improvements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Suggestions for Improvement:</p>
                      <ul className="space-y-1">
                        {aiSuggestions.improvements.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {aiSuggestions.collocations && aiSuggestions.collocations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Common Collocations:</p>
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.collocations.map((collocation, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {collocation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CEFR Level */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            CEFR: {vocabulary.cefr_level}
          </Badge>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < vocabulary.mastery_level ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <Button onClick={onContinue} className="w-full mt-6" size="lg">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
