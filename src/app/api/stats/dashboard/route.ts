import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Get overall accuracy from study activities
    const { data: accuracyData, error: accuracyError } = await supabase
      .from('study_activities')
      .select('is_correct')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (accuracyError) {
      console.error('Error fetching accuracy data:', accuracyError);
    }

    const totalActivities = accuracyData?.length || 0;
    const correctActivities = accuracyData?.filter(a => a.is_correct).length || 0;
    const accuracy = totalActivities > 0 ? (correctActivities / totalActivities) * 100 : 0;

    // 2. Get best streak from session summaries
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('session_summaries')
      .select('started_at, words_studied')
      .eq('user_id', userId)
      .gt('words_studied', 0)
      .order('started_at', { ascending: false })
      .limit(365);

    if (sessionsError) {
      console.error('Error fetching sessions data:', sessionsError);
    }

    let bestStreak = 0;
    let currentStreak = 0;
    
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

      // Calculate streaks
      const sortedDates = Array.from(sessionsByDate.keys()).sort().reverse();
      let currentDate = new Date();
      let streakDate = new Date(currentDate);
      
      // Check if today has a session
      const today = currentDate.toISOString().split('T')[0];
      const todayHasSession = sessionsByDate.has(today);
      
      if (!todayHasSession) {
        streakDate.setDate(streakDate.getDate() - 1);
      }

      // Calculate current streak
      for (const date of sortedDates) {
        const checkDate = streakDate.toISOString().split('T')[0];
        if (date === checkDate) {
          currentStreak++;
          streakDate.setDate(streakDate.getDate() - 1);
        } else if (date < checkDate) {
          break;
        }
      }

      // Calculate best streak by checking all possible streaks
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

    // 3. Get words per day statistics
    const { data: dailyStats, error: dailyError } = await supabase
      .from('session_summaries')
      .select('started_at, words_studied')
      .eq('user_id', userId)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: true });

    if (dailyError) {
      console.error('Error fetching daily stats:', dailyError);
    }

    // Calculate daily aggregations
    const dailyWordsMap = new Map();
    let totalWordsStudied = 0;
    
    if (dailyStats) {
      dailyStats.forEach(session => {
        const date = new Date(session.started_at).toISOString().split('T')[0];
        const words = session.words_studied || 0;
        
        if (!dailyWordsMap.has(date)) {
          dailyWordsMap.set(date, 0);
        }
        dailyWordsMap.set(date, dailyWordsMap.get(date) + words);
        totalWordsStudied += words;
      });
    }

    const studyDays = dailyWordsMap.size;
    const averageWordsPerDay = studyDays > 0 ? totalWordsStudied / studyDays : 0;
    const maxWordsPerDay = dailyWordsMap.size > 0 ? Math.max(...dailyWordsMap.values()) : 0;

    // 4. Get mastery statistics
    const { data: masteryStats, error: masteryError } = await supabase
      .from('vocabulary_mastery_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (masteryError) {
      console.error('Error fetching mastery stats:', masteryError);
    }

    // 5. Get recent performance
    const { data: recentPerformance, error: recentError } = await supabase
      .from('recent_study_performance')
      .select('*')
      .eq('user_id', userId)
      .order('accuracy_percentage', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent performance:', recentError);
    }

    // 6. Get activity breakdown by type
    const { data: activityBreakdown, error: activityError } = await supabase
      .from('study_activities')
      .select('activity_type, is_correct')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    const activityStats = {};
    if (activityBreakdown) {
      activityBreakdown.forEach(activity => {
        if (!activityStats[activity.activity_type]) {
          activityStats[activity.activity_type] = { total: 0, correct: 0 };
        }
        activityStats[activity.activity_type].total++;
        if (activity.is_correct) {
          activityStats[activity.activity_type].correct++;
        }
      });

      // Calculate accuracy for each activity type
      Object.keys(activityStats).forEach(type => {
        const stats = activityStats[type];
        stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      });
    }

    // 7. Get daily word counts for chart data
    const dailyWordCounts = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyWordCounts.push({
        date: dateStr,
        words: dailyWordsMap.get(dateStr) || 0
      });
    }

    const dashboardStats = {
      // Core metrics
      accuracy: Math.round(accuracy * 100) / 100,
      bestStreak,
      currentStreak,
      
      // Words per day metrics
      wordsPerDay: {
        average: Math.round(averageWordsPerDay * 100) / 100,
        max: maxWordsPerDay,
        total: totalWordsStudied,
        studyDays
      },
      
      // Activity statistics
      activityStats,
      
      // Mastery breakdown
      mastery: masteryStats || {
        total_vocabularies: 0,
        new_words: 0,
        learning_words: 0,
        young_words: 0,
        mature_words: 0,
        proficient_words: 0,
        mastered_words: 0,
        mastery_percentage: 0
      },
      
      // Recent performance
      recentPerformance: recentPerformance || [],
      
      // Chart data
      dailyWordCounts,
      
      // Meta
      periodDays: days,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json(dashboardStats);

  } catch (error) {
    console.error('Error in GET /api/stats/dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
