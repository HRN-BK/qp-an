import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  try {
    const body = await request.json();
    const { user_id, vocabulary_ids, new_mastery_level, reason } = body;

    // Validate required fields
    if (!user_id || !Array.isArray(vocabulary_ids) || typeof new_mastery_level !== 'number') {
      return NextResponse.json(
        { error: 'user_id, vocabulary_ids array, and new_mastery_level are required' },
        { status: 400 }
      );
    }

    // Update mastery level for the specified vocabulary
    const { error } = await supabase
      .from('user_vocabularies')
      .update({ mastery_level: new_mastery_level, updated_at: new Date().toISOString() })
      .match({ user_id })
      .in('vocabulary_id', vocabulary_ids);

    if (error) {
      console.error('Error updating mastery levels:', error);
      return NextResponse.json(
        { error: 'Failed to update mastery levels' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mastery levels updated successfully'
    });

  } catch (error) {
    console.error('Error in reset mastery API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
