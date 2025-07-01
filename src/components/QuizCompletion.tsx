'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Trophy, RotateCcw, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface QuizResult {
  vocabulary_id: string;
  word: string;
  meaning: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  response_time?: number;
}

interface QuizCompletionProps {
  results: QuizResult[];
  onRestart: () => void;
  onContinue: () => void;
  userId: string;
}

export default function QuizCompletion({ 
  results, 
  onRestart, 
  onContinue,
  userId 
}: QuizCompletionProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedToDatabase, setSavedToDatabase] = useState(false);

  // Calculate statistics
  const totalQuestions = results.length;
  const correctAnswers = results.filter(r => r.is_correct).length;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const accuracyPercentage = Math.round((correctAnswers / totalQuestions) * 100);
  const incorrectPercentage = Math.round((incorrectAnswers / totalQuestions) * 100);

  // Get incorrect vocabulary for mastery level reset
  const incorrectVocabulary = results.filter(r => !r.is_correct);

  useEffect(() => {
    // Auto-save results when component mounts
    saveQuizResults();
  }, []);

  const saveQuizResults = async () => {
    if (savedToDatabase) return;
    
    setIsSaving(true);
    
    try {
      // Save quiz session summary
      const sessionResponse = await fetch('/api/quiz/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          incorrect_answers: incorrectAnswers,
          accuracy_percentage: accuracyPercentage,
          session_duration: calculateSessionDuration(),
          quiz_type: 'mixed_review'
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to save quiz session');
      }

      const sessionData = await sessionResponse.json();

      // Save individual quiz results
      const resultsResponse = await fetch('/api/quiz/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          user_id: userId,
          results: results.map(result => ({
            vocabulary_id: result.vocabulary_id,
            user_answer: result.user_answer,
            is_correct: result.is_correct,
            response_time: result.response_time || 0
          }))
        }),
      });

      if (!resultsResponse.ok) {
        throw new Error('Failed to save quiz results');
      }

      // Reset mastery level to 1 for incorrect vocabulary
      if (incorrectVocabulary.length > 0) {
        const masteryResponse = await fetch('/api/vocabulary/reset-mastery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            vocabulary_ids: incorrectVocabulary.map(v => v.vocabulary_id),
            new_mastery_level: 1,
            reason: 'quiz_incorrect_answer'
          }),
        });

        if (!masteryResponse.ok) {
          throw new Error('Failed to reset mastery levels');
        }
      }

      setSavedToDatabase(true);
      toast.success('Kết quả quiz đã được lưu thành công!');
      
    } catch (error) {
      console.error('Error saving quiz results:', error);
      toast.error('Không thể lưu kết quả quiz. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateSessionDuration = () => {
    // Calculate based on response times if available
    const totalResponseTime = results.reduce((sum, result) => {
      return sum + (result.response_time || 5000); // Default 5 seconds if not tracked
    }, 0);
    return Math.round(totalResponseTime / 1000); // Convert to seconds
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeEmoji = (percentage: number) => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 80) return '🎉';
    if (percentage >= 70) return '👍';
    return '💪';
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Congratulations Header */}
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Trophy className="w-16 h-16 text-yellow-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Chúc mừng! Bạn đã hoàn thành quiz! {getGradeEmoji(accuracyPercentage)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">📊 Kết quả chi tiết</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Tổng câu hỏi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Câu đúng</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{incorrectAnswers}</div>
              <div className="text-sm text-muted-foreground">Câu sai</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getGradeColor(accuracyPercentage)}`}>
                {accuracyPercentage}%
              </div>
              <div className="text-sm text-muted-foreground">Độ chính xác</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tỷ lệ chính xác</span>
              <span className={getGradeColor(accuracyPercentage)}>
                {accuracyPercentage}%
              </span>
            </div>
            <Progress value={accuracyPercentage} className="h-3" />
          </div>

          {/* Accuracy Analysis */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Trả lời đúng:
                </span>
                <span className="font-semibold">{correctAnswers}/{totalQuestions} ({accuracyPercentage}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Trả lời sai:
                </span>
                <span className="font-semibold">{incorrectAnswers}/{totalQuestions} ({incorrectPercentage}%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incorrect Answers Review */}
      {incorrectVocabulary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Từ vựng cần ôn tập lại ({incorrectVocabulary.length} từ)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Các từ vựng này đã được đặt lại về cấp độ 1 để bạn học lại từ đầu.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incorrectVocabulary.map((item, index) => (
                <div 
                  key={index}
                  className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-semibold text-primary">{item.word}</div>
                      <div className="text-sm text-muted-foreground">
                        Nghĩa: {item.meaning}
                      </div>
                      <div className="text-sm">
                        <span className="text-red-600">Bạn trả lời: {item.user_answer}</span>
                        <br />
                        <span className="text-green-600">Đáp án đúng: {item.correct_answer}</span>
                      </div>
                    </div>
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline" 
          onClick={onRestart}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Làm lại quiz
        </Button>
        <Button 
          onClick={onContinue}
          className="flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Tiếp tục học
        </Button>
      </div>

      {/* Save Status */}
      {(isSaving || savedToDatabase) && (
        <div className="text-center text-sm text-muted-foreground">
          {isSaving ? '💾 Đang lưu kết quả...' : '✅ Kết quả đã được lưu thành công'}
        </div>
      )}
    </div>
  );
}
