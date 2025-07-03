import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const supabase = createServiceClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      total_questions,
      correct_answers,
      incorrect_answers,
      accuracy_percentage,
      session_duration,
      quiz_type = 'mixed_review'
    } = body;

    // Validate required fields
    if (!user_id || typeof total_questions !== 'number') {
      return NextResponse.json(
        { error: 'user_id and total_questions are required' },
        { status: 400 }
      );
    }

    // Insert quiz session summary
    const { data: sessionData, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id,
        total_questions,
        correct_answers,
        incorrect_answers,
        accuracy_percentage,
        session_duration,
        quiz_type,
        completed_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Error saving quiz session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to save quiz session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session_id: sessionData.id,
      message: 'Quiz session saved successfully'
    });

  } catch (error) {
    console.error('Error in quiz session API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
