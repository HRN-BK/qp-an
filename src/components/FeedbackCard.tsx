'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Save, CheckCircle, Loader2 } from 'lucide-react';

interface FeedbackData {
  isCorrect: boolean;
  score: number;
  feedback: string;
  collocations: string[];
  phrasalVerbs: string[];
  word: string;
}

interface FeedbackCardProps {
  feedbackData: FeedbackData;
  onContinue?: () => void;
}

interface SavedState {
  [key: string]: 'idle' | 'saving' | 'saved';
}

export function FeedbackCard({ feedbackData, onContinue }: FeedbackCardProps) {
  const [savedStates, setSavedStates] = useState<SavedState>({});

  const { isCorrect, score, feedback, collocations, phrasalVerbs, word } = feedbackData;

  const handleSaveCollocation = async (collocation: string, type: 'collocation' | 'phrasal_verb') => {
    const key = `${type}-${collocation}`;
    
    setSavedStates(prev => ({ ...prev, [key]: 'saving' }));

    try {
      const response = await fetch('/api/vocab/collocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collocation,
          word,
          type,
        }),
      });

      if (response.ok) {
        setSavedStates(prev => ({ ...prev, [key]: 'saved' }));
      } else {
        // Reset to idle on error
        setSavedStates(prev => ({ ...prev, [key]: 'idle' }));
        console.error('Failed to save collocation');
      }
    } catch (error) {
      setSavedStates(prev => ({ ...prev, [key]: 'idle' }));
      console.error('Error saving collocation:', error);
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-700';
    if (score >= 6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getSaveButtonContent = (item: string, type: 'collocation' | 'phrasal_verb') => {
    const key = `${type}-${item}`;
    const state = savedStates[key] || 'idle';

    switch (state) {
      case 'saving':
        return (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Saving...
          </>
        );
      case 'saved':
        return (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Saved ✔
          </>
        );
      default:
        return (
          <>
            <Save className="h-3 w-3 mr-1" />
            Save
          </>
        );
    }
  };

  return (
    <Card className={`border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} transition-all duration-300`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center justify-between ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
          <div className="flex items-center gap-2">
            {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            {isCorrect ? 'Correct!' : 'Needs Improvement'}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              className={`text-sm ${getScoreBadgeColor(score)}`}
              variant={getScoreBadgeVariant(score)}
            >
              Score: {score}/10
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Feedback Section */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">AI Feedback</h4>
            
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Detailed Feedback:</p>
              <p className="text-gray-700 bg-gray-50 p-3 rounded leading-relaxed">{feedback}</p>
            </div>
          </div>
        </div>

        {/* Collocations & Phrasal Verbs Section */}
        {(collocations.length > 0 || phrasalVerbs.length > 0) && (
          <div className="bg-white rounded-lg p-4 border">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Vocabulary Suggestions</h4>
              
              {/* Collocations */}
              {collocations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-3">Common Collocations:</p>
                  <ul className="space-y-2">
                    {collocations.map((collocation, index) => {
                      const key = `collocation-${collocation}`;
                      const state = savedStates[key] || 'idle';
                      
                      return (
                        <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span className="text-gray-700 font-medium">{collocation}</span>
                          </div>
                          <Button
                            size="sm"
                            variant={state === 'saved' ? 'default' : 'outline'}
                            onClick={() => handleSaveCollocation(collocation, 'collocation')}
                            disabled={state !== 'idle'}
                            className={`text-xs ${state === 'saved' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          >
                            {getSaveButtonContent(collocation, 'collocation')}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Phrasal Verbs */}
              {phrasalVerbs.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-3">Phrasal Verbs:</p>
                  <ul className="space-y-2">
                    {phrasalVerbs.map((phrasalVerb, index) => {
                      const key = `phrasal_verb-${phrasalVerb}`;
                      const state = savedStates[key] || 'idle';
                      
                      return (
                        <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-purple-500 mt-1">•</span>
                            <span className="text-gray-700 font-medium">{phrasalVerb}</span>
                          </div>
                          <Button
                            size="sm"
                            variant={state === 'saved' ? 'default' : 'outline'}
                            onClick={() => handleSaveCollocation(phrasalVerb, 'phrasal_verb')}
                            disabled={state !== 'idle'}
                            className={`text-xs ${state === 'saved' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          >
                            {getSaveButtonContent(phrasalVerb, 'phrasal_verb')}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {onContinue && (
          <Button onClick={onContinue} className="w-full mt-6" size="lg">
            Continue
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
