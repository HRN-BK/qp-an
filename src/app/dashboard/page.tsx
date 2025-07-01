"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SimpleBarChart, MasteryBreakdown } from '@/components/ui/simple-chart';
import { 
  TrendingUp, 
  Target, 
  Flame, 
  BookOpen, 
  Calendar,
  Clock,
  BarChart3,
  Award,
  RefreshCw
} from 'lucide-react';

interface StudyStats {
  totalWords: number;
  masteredWords: number;
  todayStudied: number;
  weeklyStudied: number;
  currentStreak: number;
  bestStreak: number;
  accuracy: number;
  weeklyGoal: number;
  weeklyProgress: number;
  mastery: {
    new: number;
    learning: number;
    young: number;
    mature: number;
    proficient: number;
    mastered: number;
    total: number;
    masteryPercentage: number;
  };
  activities: {
    total: number;
    correct: number;
    incorrect: number;
    period: number;
  };
}

interface DashboardStats {
  accuracy: number;
  bestStreak: number;
  currentStreak: number;
  wordsPerDay: {
    average: number;
    max: number;
    total: number;
    studyDays: number;
  };
  mastery: {
    total_vocabularies: number;
    new_words: number;
    learning_words: number;
    young_words: number;
    mature_words: number;
    proficient_words: number;
    mastered_words: number;
    mastery_percentage: number;
  };
  dailyWordCounts: Array<{
    date: string;
    words: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both study stats and dashboard stats
      const [studyResponse, dashboardResponse] = await Promise.all([
        fetch('/api/stats/study?days=7'),
        fetch('/api/stats/dashboard?days=7')
      ]);

      if (!studyResponse.ok || !dashboardResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const [studyData, dashboardData] = await Promise.all([
        studyResponse.json(),
        dashboardResponse.json()
      ]);

      setStudyStats(studyData);
      setDashboardStats(dashboardData);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Loading your vocabulary progress...
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error) {
    return (
      <ProtectedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-red-600">{error}</p>
          </div>
          <Button onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your vocabulary learning progress
            </p>
          </div>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Words</p>
                  <p className="text-2xl font-bold">{studyStats?.totalWords || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mastered</p>
                  <p className="text-2xl font-bold">{studyStats?.masteredWords || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Flame className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">{studyStats?.currentStreak || 0} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold">{studyStats?.accuracy || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Rings and Charts */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Weekly Progress Ring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ProgressRing 
                progress={studyStats?.weeklyProgress || 0}
                size={140}
                color="hsl(var(--primary))"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">{studyStats?.weeklyStudied || 0}</div>
                  <div className="text-xs text-muted-foreground">of {studyStats?.weeklyGoal || 50}</div>
                  <div className="text-xs text-muted-foreground">words</div>
                </div>
              </ProgressRing>
            </CardContent>
          </Card>

          {/* Mastery Progress Ring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Mastery Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ProgressRing 
                progress={studyStats?.mastery.masteryPercentage || 0}
                size={140}
                color="hsl(142, 76%, 36%)"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(studyStats?.mastery.masteryPercentage || 0)}%</div>
                  <div className="text-xs text-muted-foreground">mastered</div>
                </div>
              </ProgressRing>
            </CardContent>
          </Card>

          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Daily Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardStats?.dailyWordCounts && (
                <SimpleBarChart 
                  data={dashboardStats.dailyWordCounts.map(d => ({
                    date: d.date,
                    value: d.words,
                    label: `${d.words} words`
                  }))}
                  height={120}
                  color="hsl(var(--primary))"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mastery Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Mastery Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {studyStats?.mastery && (
              <MasteryBreakdown 
                mastery={{
                  new: studyStats.mastery.new,
                  learning: studyStats.mastery.learning,
                  young: studyStats.mastery.young,
                  mature: studyStats.mastery.mature,
                  proficient: studyStats.mastery.proficient,
                  mastered: studyStats.mastery.mastered,
                  total: studyStats.mastery.total
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Study Summary (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Activities</span>
                <Badge variant="secondary">{studyStats?.activities.total || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Correct Answers</span>
                <Badge variant="default">{studyStats?.activities.correct || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Today Studied</span>
                <Badge variant="outline">{studyStats?.todayStudied || 0} words</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Best Streak</span>
                <Badge variant="secondary">{studyStats?.bestStreak || 0} days</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => router.push('/flashcards')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Start Review Session
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/vocabulary')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Add New Words
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/study')}>
                <Clock className="h-4 w-4 mr-2" />
                Practice Games
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
