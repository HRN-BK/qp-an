import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      session_id,
      session_type = 'study',
      started_at,
      finished_at,
      words_studied,
      correct_answers,
      total_answers,
      average_response_time_ms,
      session_duration_seconds,
      tags_studied
    } = body;

    // Validate session_type
    const validSessionTypes = ['study', 'review', 'test', 'practice'];
    if (!validSessionTypes.includes(session_type)) {
      return NextResponse.json(
        { error: `Invalid session_type. Must be one of: ${validSessionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // If session_id is provided, try to update existing session (upsert)
    if (session_id) {
      // Check if session exists
      const { data: existingSession } = await supabase
        .from('session_summaries')
        .select('id')
        .eq('session_id', session_id)
        .eq('user_id', userId)
        .single();

      if (existingSession) {
        // Update existing session
        const updateData: any = {
          session_type,
          updated_at: new Date().toISOString()
        };

        // Only update fields that are provided
        if (finished_at !== undefined) updateData.finished_at = finished_at;
        if (words_studied !== undefined) updateData.words_studied = words_studied;
        if (correct_answers !== undefined) updateData.correct_answers = correct_answers;
        if (total_answers !== undefined) updateData.total_answers = total_answers;
        if (average_response_time_ms !== undefined) updateData.average_response_time_ms = average_response_time_ms;
        if (session_duration_seconds !== undefined) updateData.session_duration_seconds = session_duration_seconds;
        if (tags_studied !== undefined) updateData.tags_studied = tags_studied;

        const { data, error } = await supabase
          .from('session_summaries')
          .update(updateData)
          .eq('session_id', session_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating session summary:', error);
          return NextResponse.json(
            { error: 'Failed to update session summary' },
            { status: 500 }
          );
        }

        return NextResponse.json({ 
          message: 'Session summary updated successfully',
          data,
          action: 'updated'
        });
      }
    }

    // Create new session
    const insertData: any = {
      user_id: userId,
      session_type,
      started_at: started_at || new Date().toISOString(),
      words_studied: words_studied || 0,
      correct_answers: correct_answers || 0,
      total_answers: total_answers || 0,
      average_response_time_ms,
      session_duration_seconds,
      tags_studied: tags_studied || []
    };

    // Use provided session_id or let database generate one
    if (session_id) {
      insertData.session_id = session_id;
    }

    if (finished_at) {
      insertData.finished_at = finished_at;
    }

    const { data, error } = await supabase
      .from('session_summaries')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting session summary:', error);
      return NextResponse.json(
        { error: 'Failed to create session summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Session summary created successfully',
      data,
      action: 'created'
    });

  } catch (error) {
    console.error('Error in POST /api/stats/session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const session_type = searchParams.get('session_type');
    const session_id = searchParams.get('session_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    let query = supabase
      .from('session_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (session_type) {
      query = query.eq('session_type', session_type);
    }
    if (session_id) {
      query = query.eq('session_id', session_id);
    }
    if (start_date) {
      query = query.gte('started_at', start_date);
    }
    if (end_date) {
      query = query.lte('started_at', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching session summaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session summaries' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      sessions: data,
      total: data.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in GET /api/stats/session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    // Call the update_session_summary function to recalculate stats
    const { error } = await supabase.rpc('update_session_summary', {
      session_uuid: session_id
    });

    if (error) {
      console.error('Error updating session summary:', error);
      return NextResponse.json(
        { error: 'Failed to update session summary' },
        { status: 500 }
      );
    }

    // Fetch the updated session
    const { data, error: fetchError } = await supabase
      .from('session_summaries')
      .select('*')
      .eq('session_id', session_id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated session:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Session summary recalculated successfully',
      data
    });

  } catch (error) {
    console.error('Error in PUT /api/stats/session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
