import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vocabularyId, rating } = body;

    // Validate input
    if (!vocabularyId || !rating || rating < 1 || rating > 3) {
      return NextResponse.json(
        { error: "Valid vocabulary ID and rating (1-3) are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get current vocabulary
    const { data: vocabulary, error: fetchError } = await supabase
      .from('vocabularies')
      .select('*')
      .eq('id', vocabularyId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !vocabulary) {
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
      );
    }

    // Calculate next review date based on rating
    const now = new Date();
    let nextReview = new Date(now);
    let masteryLevel = vocabulary.mastery_level || 0;
    let easeFactor = vocabulary.ease_factor || 2.5;

    // Simple spaced repetition logic
    switch (rating) {
      case 1: // Hard - review in 1 day, decrease mastery
        nextReview.setDate(now.getDate() + 1);
        masteryLevel = Math.max(0, masteryLevel - 1);
        easeFactor = Math.max(1.3, easeFactor - 0.2);
        break;
      case 2: // Good - review in 3 days, keep mastery
        nextReview.setDate(now.getDate() + 3);
        break;
      case 3: // Easy - review in 7 days, increase mastery
        nextReview.setDate(now.getDate() + 7);
        masteryLevel = Math.min(5, masteryLevel + 1);
        easeFactor = Math.min(2.5, easeFactor + 0.1);
        break;
    }

    // Apply ease factor to interval
    if (rating > 1) {
      const baseInterval = rating === 2 ? 3 : 7;
      const adjustedInterval = Math.round(baseInterval * easeFactor);
      nextReview = new Date(now);
      nextReview.setDate(now.getDate() + adjustedInterval);
    }

    // Update vocabulary - only update existing columns
    const updateData: any = {
      updated_at: now.toISOString()
    };

    // Only add fields that exist in the current schema
    if ('mastery_level' in vocabulary) {
      updateData.mastery_level = masteryLevel;
    }
    if ('ease_factor' in vocabulary) {
      updateData.ease_factor = easeFactor;
    }
    if ('next_review' in vocabulary) {
      updateData.next_review = nextReview.toISOString();
    }
    if ('last_reviewed' in vocabulary) {
      updateData.last_reviewed = now.toISOString();
    }
    if ('review_count' in vocabulary) {
      updateData.review_count = (vocabulary.review_count || 0) + 1;
    }

    const { error: updateError } = await supabase
      .from('vocabularies')
      .update(updateData)
      .eq('id', vocabularyId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating vocabulary:', updateError);
      return NextResponse.json(
        { error: "Failed to update vocabulary" },
        { status: 500 }
      );
    }

    // Log study activity if table exists
    try {
      await supabase
        .from('study_activities')
        .insert({
          vocabulary_id: vocabularyId,
          user_id: userId,
          activity_type: 'flashcard',
          is_correct: rating >= 2,
          created_at: now.toISOString()
        });
    } catch (error) {
      // Ignore if table doesn't exist
      console.log('Study activities table not available');
    }

    const daysUntilReview = Math.ceil((nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      message: "Review recorded successfully",
      masteryLevel,
      nextReview: nextReview.toISOString(),
      daysUntilReview,
      rating
    });

  } catch (error) {
    console.error('Error in flashcard review:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
