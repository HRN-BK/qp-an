"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCcw, Clock, Calendar, TrendingUp } from 'lucide-react';

interface NextReview {
  next_review: string;
  count: number;
  hours_until: number;
}

interface CompletionCardProps {
  onRefresh: () => void;
}

export function CompletionCard({ onRefresh }: CompletionCardProps) {
  const router = useRouter();
  const [nextReviews, setNextReviews] = useState<NextReview[]>([]);
  const [stats, setStats] = useState({
    total_words: 0,
    mastered_words: 0,
    mastery_percentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNextReviews();
  }, []);

  const fetchNextReviews = async () => {
    try {
      setLoading(true);
      // Fetch next review times
      const reviewResponse = await fetch('/api/vocab/due?next_reviews=true');
      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        setNextReviews(reviewData.next_reviews || []);
      }

      // Fetch mastery stats
      const statsResponse = await fetch('/api/stats/study');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          total_words: statsData.totalWords || 0,
          mastered_words: statsData.masteredWords || 0,
          mastery_percentage: statsData.mastery?.masteryPercentage || 0
        });
      }
    } catch (error) {
      console.error('Error fetching completion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeUntil = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    if (hours < 24) {
      const roundedHours = Math.round(hours);
      return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
    }
    
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If it's today, just show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show date and time
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Auto-refresh when the next review is due
  useEffect(() => {
    if (nextReviews.length > 0) {
      const nextReview = nextReviews[0];
      const msUntilNext = nextReview.hours_until * 60 * 60 * 1000;
      
      if (msUntilNext > 0 && msUntilNext < 24 * 60 * 60 * 1000) { // Within 24 hours
        const timer = setTimeout(() => {
          onRefresh();
        }, msUntilNext);
        
        return () => clearTimeout(timer);
      }
    }
  }, [nextReviews, onRefresh]);

  return (
    <Card>
      <CardContent className="p-8 md:p-12 text-center">
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-semibold mb-2">All caught up! 🎉</h2>
        <p className="text-muted-foreground mb-6">
          Great job! You've completed all your vocabulary reviews for now.
        </p>

        {/* Progress Stats */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total_words}</div>
              <div className="text-sm text-muted-foreground">Total Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.mastered_words}</div>
              <div className="text-sm text-muted-foreground">Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.mastery_percentage}%</div>
              <div className="text-sm text-muted-foreground">Mastery Rate</div>
            </div>
          </div>
        )}

        {/* Next Reviews */}
        {!loading && nextReviews.length > 0 && (
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-medium flex items-center justify-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Reviews
            </h3>
            <div className="space-y-2">
              {nextReviews.slice(0, 5).map((review, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatDateTime(review.next_review)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {review.count} word{review.count !== 1 ? 's' : ''}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      in {formatTimeUntil(review.hours_until)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRefresh} variant="default">
            <RotateCcw className="h-4 w-4 mr-2" />
            Check for Reviews
          </Button>
          
          {stats.mastery_percentage < 100 && (
            <Button variant="outline" onClick={() => router.push('/vocabulary')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Add More Words
            </Button>
          )}
        </div>

        {/* Encouragement */}
        <div className="mt-6 text-sm text-muted-foreground">
          {stats.mastery_percentage >= 80 ? (
            <p>🌟 Amazing progress! You're becoming a vocabulary master!</p>
          ) : stats.mastery_percentage >= 50 ? (
            <p>📈 You're doing great! Keep up the consistent practice!</p>
          ) : (
            <p>🚀 Every word learned is progress. Keep going!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
