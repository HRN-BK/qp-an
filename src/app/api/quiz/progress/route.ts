import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase';

interface QuizProgressRequest {
  sessionId: string;
  vocabularyResults: Array<{
    vocabularyId: number;
    activityType: 'listening' | 'translation' | 'synonym' | 'fill_blank';
    isCorrect: boolean;
    responseTime: number;
    userAnswer: string;
  }>;
  currentIndex: number;
  totalVocabularies: number;
  score: number;
  streak: number;
  isComplete: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: QuizProgressRequest = await request.json();
    const {
      sessionId,
      vocabularyResults,
      currentIndex,
      totalVocabularies,
      score,
      streak,
      isComplete
    } = body;

    const supabase = createServiceClient();

    // Upsert quiz session
    const { data: sessionData, error: sessionError } = await supabase
      .from('quiz_sessions')
      .upsert(
        {
          id: sessionId,
          user_id: userId,
          total_questions: totalVocabularies,
          questions_answered: vocabularyResults.length,
          correct_answers: vocabularyResults.filter(r => r.isCorrect).length,
          score: score,
          max_streak: streak,
          is_completed: isComplete,
          started_at: new Date().toISOString(),
          completed_at: isComplete ? new Date().toISOString() : null
        },
        {
          onConflict: 'id'
        }
      )
      .select()
      .single();

    if (sessionError) {
      console.error('Error upserting quiz session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to save quiz session' },
        { status: 500 }
      );
    }

    // Save individual quiz results if there are new ones
    if (vocabularyResults.length > 0) {
      const quizResults = vocabularyResults.map(result => ({
        session_id: sessionId,
        vocabulary_id: result.vocabularyId,
        activity_type: result.activityType,
        is_correct: result.isCorrect,
        response_time_ms: result.responseTime,
        user_answer: result.userAnswer,
        answered_at: new Date().toISOString()
      }));

      // Use upsert to avoid duplicate entries
      const { error: resultsError } = await supabase
        .from('quiz_results')
        .upsert(quizResults, {
          onConflict: 'session_id,vocabulary_id'
        });

      if (resultsError) {
        console.error('Error saving quiz results:', resultsError);
        return NextResponse.json(
          { error: 'Failed to save quiz results' },
          { status: 500 }
        );
      }
    }

    // If quiz is complete, update mastery levels for incorrect answers
    if (isComplete) {
      const incorrectVocabIds = vocabularyResults
        .filter(result => !result.isCorrect)
        .map(result => result.vocabularyId);

      if (incorrectVocabIds.length > 0) {
        const { error: masteryError } = await supabase
          .from('vocabularies')
          .update({ 
            mastery_level: 1,
            updated_at: new Date().toISOString()
          })
          .in('id', incorrectVocabIds)
          .eq('user_id', userId);

        if (masteryError) {
          console.error('Error updating mastery levels:', masteryError);
          // Don't fail the request for mastery update errors
        }
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionData.id,
      saved: vocabularyResults.length,
      isComplete
    });

  } catch (error) {
    console.error('Error in quiz progress API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
