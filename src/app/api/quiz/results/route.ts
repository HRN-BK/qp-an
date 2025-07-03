import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const supabase = createServiceClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, user_id, results } = body;

    // Validate required fields
    if (!session_id || !user_id || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'session_id, user_id, and results array are required' },
        { status: 400 }
      );
    }

    // Prepare quiz results data for bulk insert
    const quizResultsData = results.map((result: any) => ({
      session_id,
      user_id,
      vocabulary_id: result.vocabulary_id,
      user_answer: result.user_answer,
      is_correct: result.is_correct,
      response_time: result.response_time || 0,
      created_at: new Date().toISOString()
    }));

    // Insert quiz results
    const { data: resultsData, error: resultsError } = await supabase
      .from('quiz_results')
      .insert(quizResultsData)
      .select('id');

    if (resultsError) {
      console.error('Error saving quiz results:', resultsError);
      return NextResponse.json(
        { error: 'Failed to save quiz results' },
        { status: 500 }
      );
    }

    // Also insert into reviews table for SRS tracking
    const reviewsData = results.map((result: any) => ({
      user_id,
      vocabulary_id: result.vocabulary_id,
      is_correct: result.is_correct,
      response_time: result.response_time || 0,
      created_at: new Date().toISOString()
    }));

    const { error: reviewsError } = await supabase
      .from('reviews')
      .insert(reviewsData);

    if (reviewsError) {
      console.error('Error saving reviews:', reviewsError);
      // Don't fail the request if reviews insert fails
    }

    return NextResponse.json({
      success: true,
      results_saved: resultsData?.length || 0,
      message: 'Quiz results saved successfully'
    });

  } catch (error) {
    console.error('Error in quiz results API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
