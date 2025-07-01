import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7'); // Default to 7 days

    // Calculate date range
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total words count
    const { data: totalWordsData, error: totalError } = await supabase
      .from('vocabularies')
      .select('id')
      .eq('user_id', userId);

    if (totalError) throw totalError;

    // Get mastery statistics using the view (fallback if not available)
    let masteryStats = null;
    try {
      const { data, error: masteryError } = await supabase
        .from('vocabulary_mastery_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (!masteryError) {
        masteryStats = data;
      }
    } catch (error) {
      console.log('Mastery stats view not available, will use fallback');
    }

    // Get today's study activity
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayActivities, error: todayError } = await supabase
      .from('study_activities')
      .select('vocabulary_id')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    if (todayError) {
      console.error('Error fetching today\'s activities:', todayError);
    }

    // Get unique words studied today
    const uniqueWordsToday = new Set(todayActivities?.map(a => a.vocabulary_id)).size;

    // Calculate learning streak from session summaries (fallback if table doesn't exist)
    let sessionsData = [];
    try {
      const { data, error: sessionsError } = await supabase
        .from('session_summaries')
        .select('started_at, words_studied')
        .eq('user_id', userId)
        .gt('words_studied', 0)
        .order('started_at', { ascending: false })
        .limit(365); // Get last year
        
      if (!sessionsError) {
        sessionsData = data || [];
      }
    } catch (error) {
      console.log('Session summaries table not available, using fallback');
    }

    let currentStreak = 0;
    let bestStreak = 0;
    
    if (sessionsData && sessionsData.length > 0) {
      // Group sessions by date
      const sessionsByDate = new Map();
      sessionsData.forEach(session => {
        const date = new Date(session.started_at).toISOString().split('T')[0];
        if (!sessionsByDate.has(date)) {
          sessionsByDate.set(date, session.words_studied);
        } else {
          sessionsByDate.set(date, sessionsByDate.get(date) + session.words_studied);
        }
      });

      // Calculate current streak
      const sortedDates = Array.from(sessionsByDate.keys()).sort().reverse();
      let currentDate = new Date();
      let streakDate = new Date(currentDate);
      
      // Check if today has a session
      const todayStr = today.toISOString().split('T')[0];
      const todayHasSession = sessionsByDate.has(todayStr);
      
      if (!todayHasSession) {
        streakDate.setDate(streakDate.getDate() - 1);
      }

      // Count consecutive days for current streak
      for (const date of sortedDates) {
        const checkDate = streakDate.toISOString().split('T')[0];
        if (date === checkDate) {
          currentStreak++;
          streakDate.setDate(streakDate.getDate() - 1);
        } else if (date < checkDate) {
          break;
        }
      }

      // Calculate best streak
      let tempStreak = 0;
      let prevDate = null;
      
      for (const date of sortedDates.reverse()) {
        if (prevDate === null) {
          tempStreak = 1;
        } else {
          const currentDateObj = new Date(date);
          const prevDateObj = new Date(prevDate);
          const dayDiff = (currentDateObj.getTime() - prevDateObj.getTime()) / (1000 * 60 * 60 * 24);
          
          if (dayDiff === 1) {
            tempStreak++;
          } else {
            bestStreak = Math.max(bestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        prevDate = date;
      }
      bestStreak = Math.max(bestStreak, tempStreak, currentStreak);
    }

    // Get accuracy from recent study activities
    const { data: recentActivities, error: recentError } = await supabase
      .from('study_activities')
      .select('is_correct')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error('Error fetching recent activities:', recentError);
    }

    const totalActivities = recentActivities?.length || 0;
    const correctActivities = recentActivities?.filter(a => a.is_correct).length || 0;
    const accuracy = totalActivities > 0 ? Math.round((correctActivities / totalActivities) * 100) : 0;

    // Get weekly study progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const { data: weeklyActivities, error: weeklyError } = await supabase
      .from('study_activities')
      .select('vocabulary_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString());

    if (weeklyError) {
      console.error('Error fetching weekly activities:', weeklyError);
    }

    const uniqueWordsThisWeek = new Set(weeklyActivities?.map(a => a.vocabulary_id)).size;
    const weeklyGoal = 50; // This can be made configurable later
    const weeklyProgress = Math.min(Math.round((uniqueWordsThisWeek / weeklyGoal) * 100), 100);

    const stats = {
      // Basic counts
      totalWords: totalWordsData?.length || 0,
      masteredWords: masteryStats?.mastered_words || 0,
      todayStudied: uniqueWordsToday,
      weeklyStudied: uniqueWordsThisWeek,
      
      // Streaks
      currentStreak,
      bestStreak,
      
      // Accuracy
      accuracy,
      
      // Weekly progress
      weeklyGoal,
      weeklyProgress,
      
      // Mastery breakdown
      mastery: {
        new: masteryStats?.new_words || 0,
        learning: masteryStats?.learning_words || 0,
        young: masteryStats?.young_words || 0,
        mature: masteryStats?.mature_words || 0,
        proficient: masteryStats?.proficient_words || 0,
        mastered: masteryStats?.mastered_words || 0,
        total: masteryStats?.total_vocabularies || 0,
        masteryPercentage: masteryStats?.mastery_percentage || 0
      },
      
      // Activity summary
      activities: {
        total: totalActivities,
        correct: correctActivities,
        incorrect: totalActivities - correctActivities,
        period: days
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching study stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study stats' },
      { status: 500 }
    );
  }
}
