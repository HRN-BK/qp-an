"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  Target, 
  Trophy, 
  RotateCcw,
  Eye,
  EyeOff,
  Volume2,
  Clock,
  Zap
} from 'lucide-react'
import { playPronunciation } from '@/lib/audio-utils'

interface Vocabulary {
  id: number
  word: string
  meaning: string
  definition: string
  example: string
  pronunciation_ipa?: string
  audio_url?: string
  cefr_level: string
  mastery_level: number
}

interface GameResult {
  vocabularyId: number
  activityType: 'listening' | 'translation' | 'synonym' | 'fill_blank'
  isCorrect: boolean
  responseTime: number
  userAnswer: string
}

interface QuizResultsDetailProps {
  vocabularies: Vocabulary[]
  results: GameResult[]
  onRestart?: () => void
  onContinue?: () => void
}

const activityTypeLabels = {
  listening: '🎧 Nghe',
  translation: '🔤 Dịch',
  synonym: '📝 Từ đồng nghĩa',
  fill_blank: '✏️ Điền từ'
}

export function QuizResultsDetail({ 
  vocabularies, 
  results, 
  onRestart, 
  onContinue 
}: QuizResultsDetailProps) {
  const [showCorrectWords, setShowCorrectWords] = useState(false)
  const [showIncorrectWords, setShowIncorrectWords] = useState(false)
  
  // Calculate statistics
  const totalQuestions = results.length
  const correctAnswers = results.filter(r => r.isCorrect).length
  const incorrectAnswers = totalQuestions - correctAnswers
  const accuracyPercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  
  // Calculate average response time
  const avgResponseTime = totalQuestions > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / totalQuestions / 1000) 
    : 0
  
  // Separate correct and incorrect vocabulary items
  const correctResults = results.filter(r => r.isCorrect)
  const incorrectResults = results.filter(r => !r.isCorrect)
  
  const getVocabById = (id: number) => vocabularies.find(v => v.id === id)
  
  const playWordAudio = async (word: string, audioUrl?: string) => {
    await playPronunciation(word, audioUrl)
  }
  
  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getAccuracyBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return 'default'
    if (percentage >= 60) return 'secondary'
    return 'destructive'
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Kết quả Quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Độ chính xác</span>
              <span className={`font-bold ${getAccuracyColor(accuracyPercentage)}`}>
                {accuracyPercentage}%
              </span>
            </div>
            <Progress value={accuracyPercentage} className="h-3" />
          </div>
          
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
              <div className="text-sm text-gray-600">Tổng câu hỏi</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-gray-600">Câu đúng</div>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{incorrectAnswers}</div>
              <div className="text-sm text-gray-600">Câu sai</div>
            </div>
            
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{avgResponseTime}s</div>
              <div className="text-sm text-gray-600">Thời gian TB</div>
            </div>
          </div>
          
          {/* Accuracy Badge */}
          <div className="flex justify-center">
            <Badge variant={getAccuracyBadgeVariant(accuracyPercentage)} className="text-base px-4 py-2">
              {accuracyPercentage >= 80 ? '🎉 Xuất sắc!' : 
               accuracyPercentage >= 60 ? '👍 Tốt!' : '💪 Cần cải thiện!'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Correct/Incorrect Words Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Correct Words */}
        <Card>
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full flex items-center justify-between"
              onClick={() => setShowCorrectWords(!showCorrectWords)}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Từ trả lời đúng ({correctAnswers})</span>
              </div>
              {showCorrectWords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            {showCorrectWords && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {correctResults.map((result, index) => {
                  const vocab = getVocabById(result.vocabularyId)
                  if (!vocab) return null
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vocab.word}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playWordAudio(vocab.word, vocab.audio_url)}
                            className="h-6 w-6 p-0"
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600">{vocab.meaning}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{activityTypeLabels[result.activityType]}</span>
                          <Clock className="h-3 w-3" />
                          <span>{Math.round(result.responseTime / 1000)}s</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        {vocab.cefr_level}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incorrect Words */}
        <Card>
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full flex items-center justify-between"
              onClick={() => setShowIncorrectWords(!showIncorrectWords)}
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Từ trả lời sai ({incorrectAnswers})</span>
              </div>
              {showIncorrectWords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            {showIncorrectWords && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {incorrectResults.map((result, index) => {
                  const vocab = getVocabById(result.vocabularyId)
                  if (!vocab) return null
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vocab.word}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playWordAudio(vocab.word, vocab.audio_url)}
                            className="h-6 w-6 p-0"
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600">{vocab.meaning}</div>
                        <div className="text-xs text-red-600">
                          Bạn trả lời: "{result.userAnswer}"
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{activityTypeLabels[result.activityType]}</span>
                          <Clock className="h-3 w-3" />
                          <span>{Math.round(result.responseTime / 1000)}s</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        {vocab.cefr_level}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        {onRestart && (
          <Button onClick={onRestart} variant="outline" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Học lại
          </Button>
        )}
        {onContinue && (
          <Button onClick={onContinue} className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Tiếp tục
          </Button>
        )}
      </div>
    </div>
  )
}
