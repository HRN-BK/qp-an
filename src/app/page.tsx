'use client';

import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Zap, Tags, Plus, Calendar, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface StudyStats {
  streak: number;
  totalWords: number;
  masteredWords: number;
  todayStudied: number;
  weeklyGoal: number;
}

function StudyStatsCard() {
  const { user } = useUser();
  const [stats, setStats] = useState<StudyStats>({
    streak: 0,
    totalWords: 0,
    masteredWords: 0,
    todayStudied: 0,
    weeklyGoal: 50
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudyStats();
    }
  }, [user]);

  const fetchStudyStats = async () => {
    try {
      const response = await fetch('/api/stats/study');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching study stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Your Progress
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.streak}</div>
          <div className="text-sm text-orange-700 dark:text-orange-300 flex items-center justify-center gap-1">
            <Zap className="h-3 w-3" />
            Day Streak
          </div>
        </div>
        
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalWords}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1">
            <BookOpen className="h-3 w-3" />
            Total Words
          </div>
        </div>
        
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.masteredWords}</div>
          <div className="text-sm text-green-700 dark:text-green-300 flex items-center justify-center gap-1">
            <Target className="h-3 w-3" />
            Mastered
          </div>
        </div>
        
        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.todayStudied}</div>
          <div className="text-sm text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1">
            <Calendar className="h-3 w-3" />
            Today
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Welcome Section */}
          <Card className="p-6 text-center">
            <h1 className="text-3xl font-bold mb-4">AI Vocab</h1>
            <p className="text-muted-foreground mb-6">
              Master English vocabulary with AI-powered learning
            </p>
            <SignedOut>
              <p className="text-sm text-muted-foreground">
                Sign in to start building your vocabulary collection.
              </p>
            </SignedOut>
            <SignedIn>
              <p className="text-sm text-muted-foreground mb-4">
                Ready to expand your vocabulary? Choose where to start:
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/flashcards">
                  <Button>
                    <Zap className="h-4 w-4 mr-2" />
                    Study Now
                  </Button>
                </Link>
                <Link href="/vocabulary/new">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Word
                  </Button>
                </Link>
              </div>
            </SignedIn>
          </Card>

          {/* Study Stats */}
          <SignedIn>
            <StudyStatsCard />
          </SignedIn>

          {/* Features Section */}
          <SignedIn>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/flashcards">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5 text-blue-500" />
                      Study Cards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Practice with spaced repetition
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/vocabulary">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-green-500" />
                      Vocabulary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Manage your word collection
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/extract">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-purple-500" />
                      Extract
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Extract words from text using AI
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/tags">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Tags className="h-5 w-5 text-orange-500" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Organize with custom tags
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </SignedIn>
        </div>
      </main>
    </div>
  );
}
