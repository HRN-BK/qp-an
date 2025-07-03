import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const supabase = createServiceClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const days = parseInt(searchParams.get('days') || '30');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      );
    }

    // Get overall quiz statistics
    const { data: statsData, error: statsError } = await supabase
      .rpc('calculate_quiz_statistics', {
        p_user_id: userId,
        p_days: days
      });

    if (statsError) {
      console.error('Error fetching quiz statistics:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch quiz statistics' },
        { status: 500 }
      );
    }

    // Get recent quiz performance
    const { data: recentPerformance, error: performanceError } = await supabase
      .rpc('get_recent_quiz_performance', {
        p_user_id: userId,
        p_limit: 10
      });

    if (performanceError) {
      console.error('Error fetching recent performance:', performanceError);
      // Don't fail the request, just return empty array
    }

    // Get vocabulary that needs review
    const { data: vocabularyForReview, error: reviewError } = await supabase
      .rpc('get_vocabulary_for_review', {
        p_user_id: userId,
        p_days: 7
      });

    if (reviewError) {
      console.error('Error fetching vocabulary for review:', reviewError);
      // Don't fail the request, just return empty array
    }

    // Get quiz sessions for trending analysis
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('completed_at, accuracy_percentage, total_questions')
      .eq('user_id', userId)
      .gte('completed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('completed_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching quiz sessions:', sessionsError);
    }

    const stats = statsData?.[0] || {
      total_sessions: 0,
      total_questions: 0,
      total_correct: 0,
      total_incorrect: 0,
      average_accuracy: 0,
      best_accuracy: 0,
      total_study_time: 0
    };

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        improvement_rate: calculateImprovementRate(sessions || []),
        accuracy_trend: calculateAccuracyTrend(sessions || [])
      },
      recent_performance: recentPerformance || [],
      vocabulary_for_review: vocabularyForReview || [],
      period_days: days
    });

  } catch (error) {
    console.error('Error in quiz stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateImprovementRate(sessions: any[]): number {
  if (sessions.length < 2) return 0;

  const recentSessions = sessions.slice(0, 5); // Last 5 sessions
  const olderSessions = sessions.slice(-5); // First 5 sessions

  const recentAvg = recentSessions.reduce((sum, s) => sum + (s.accuracy_percentage || 0), 0) / recentSessions.length;
  const olderAvg = olderSessions.reduce((sum, s) => sum + (s.accuracy_percentage || 0), 0) / olderSessions.length;

  return recentAvg - olderAvg;
}

function calculateAccuracyTrend(sessions: any[]): string {
  if (sessions.length < 3) return 'stable';

  const recent = sessions.slice(0, 3).map(s => s.accuracy_percentage || 0);
  const trend = recent[0] - recent[2]; // Compare most recent with 3 sessions ago

  if (trend > 5) return 'improving';
  if (trend < -5) return 'declining';
  return 'stable';
}
