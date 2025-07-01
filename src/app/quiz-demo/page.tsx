'use client';

import { useState } from 'react';
import QuizCompletion from '@/components/QuizCompletion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock quiz results data for demonstration
const mockQuizResults = [
  {
    vocabulary_id: '1',
    word: 'apple',
    meaning: 'quả táo',
    user_answer: 'quả táo',
    correct_answer: 'quả táo',
    is_correct: true,
    response_time: 3000
  },
  {
    vocabulary_id: '2',
    word: 'beautiful',
    meaning: 'đẹp',
    user_answer: 'xinh đẹp',
    correct_answer: 'đẹp',
    is_correct: false,
    response_time: 5000
  },
  {
    vocabulary_id: '3',
    word: 'computer',
    meaning: 'máy tính',
    user_answer: 'máy tính',
    correct_answer: 'máy tính',
    is_correct: true,
    response_time: 2500
  },
  {
    vocabulary_id: '4',
    word: 'happiness',
    meaning: 'hạnh phúc',
    user_answer: 'vui vẻ',
    correct_answer: 'hạnh phúc',
    is_correct: false,
    response_time: 4000
  },
  {
    vocabulary_id: '5',
    word: 'knowledge',
    meaning: 'kiến thức',
    user_answer: 'kiến thức',
    correct_answer: 'kiến thức',
    is_correct: true,
    response_time: 3500
  }
];

export default function QuizDemoPage() {
  const [showResults, setShowResults] = useState(false);

  const handleRestart = () => {
    setShowResults(false);
    // In a real app, this would restart the quiz
    console.log('Restarting quiz...');
  };

  const handleContinue = () => {
    // In a real app, this would navigate to continue learning
    console.log('Continuing to learn...');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Quiz Completion Demo
        </h1>

        {!showResults ? (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Quiz Demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Đây là demo của component QuizCompletion. 
                Click nút bên dưới để xem kết quả quiz mẫu.
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Kết quả mẫu:</strong>
                </p>
                <ul className="text-sm text-left space-y-1">
                  <li>✅ apple - quả táo (đúng)</li>
                  <li>❌ beautiful - đẹp (sai: bạn trả lời "xinh đẹp")</li>
                  <li>✅ computer - máy tính (đúng)</li>
                  <li>❌ happiness - hạnh phúc (sai: bạn trả lời "vui vẻ")</li>
                  <li>✅ knowledge - kiến thức (đúng)</li>
                </ul>
                <p className="text-sm font-semibold">
                  Tổng kết: 3/5 đúng (60%)
                </p>
              </div>
              <Button onClick={() => setShowResults(true)}>
                Xem kết quả quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <QuizCompletion
            results={mockQuizResults}
            onRestart={handleRestart}
            onContinue={handleContinue}
            userId="demo-user-123"
          />
        )}
      </div>
    </div>
  );
}
