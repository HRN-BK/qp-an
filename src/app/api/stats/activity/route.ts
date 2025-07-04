import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      vocabulary_id,
      activity_type,
      is_correct,
      response_time_ms,
      user_answer,
      correct_answer,
      difficulty_rating,
      session_id
    } = body;

    // Validate required fields
    if (!vocabulary_id || !activity_type || is_correct === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: vocabulary_id, activity_type, is_correct' },
        { status: 400 }
      );
    }

    // Validate activity_type
    const validActivityTypes = ['flashcard', 'quiz', 'spelling', 'multiple_choice', 'fill_blank'];
    if (!validActivityTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: `Invalid activity_type. Must be one of: ${validActivityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate difficulty_rating if provided
    if (difficulty_rating !== undefined && (difficulty_rating < 1 || difficulty_rating > 5)) {
      return NextResponse.json(
        { error: 'difficulty_rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Insert study activity
    const { data, error } = await supabase
      .from('study_activities')
      .insert({
        vocabulary_id,
        user_id: userId,
        activity_type,
        is_correct,
        response_time_ms,
        user_answer,
        correct_answer,
        difficulty_rating,
        session_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting study activity:', error);
      return NextResponse.json(
        { error: 'Failed to insert study activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Study activity recorded successfully',
      data 
    });

  } catch (error) {
    console.error('Error in POST /api/stats/activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activity_type = searchParams.get('activity_type');
    const session_id = searchParams.get('session_id');
    const vocabulary_id = searchParams.get('vocabulary_id');

    let query = supabase
      .from('study_activities')
      .select(`
        *,
        vocabularies:vocabulary_id (
          word,
          definition,
          tags
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (activity_type) {
      query = query.eq('activity_type', activity_type);
    }
    if (session_id) {
      query = query.eq('session_id', session_id);
    }
    if (vocabulary_id) {
      query = query.eq('vocabulary_id', vocabulary_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching study activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch study activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      activities: data,
      total: data.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in GET /api/stats/activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
