import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { calculateSpacedRepetition, VocabularyData } from "@/lib/srs";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vocabularyId, isCorrect, masteryLevel, sessionId, activityType = 'flashcard', responseTimeMs, userAnswer, shouldLowerMastery } = body;

    // Validate required fields
    if (!vocabularyId || typeof isCorrect !== "boolean") {
      return NextResponse.json(
        { error: "Valid vocabulary ID and isCorrect boolean are required" },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(vocabularyId)) {
      return NextResponse.json(
        { error: "Invalid vocabulary ID format" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get current vocabulary data with new fields
    const { data: vocabulary, error: fetchError } = await supabase
      .from('vocabularies')
      .select(`
        id, word, meaning, definition, created_at, difficulty, 
        mastery_level, last_mastered, consecutive_correct, 
        consecutive_incorrect, ease_factor, last_reviewed, 
        next_review, review_count
      `)
      .eq('id', vocabularyId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !vocabulary) {
      console.error('Error fetching vocabulary:', fetchError);
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
      );
    }

    // Apply mastery level override if provided
    let currentMasteryLevel = masteryLevel !== undefined ? masteryLevel : (vocabulary.mastery_level || 0);
    
    // Prepare vocabulary data for SRS calculation
    const vocabularyData: VocabularyData = {
      id: vocabulary.id,
      mastery_level: currentMasteryLevel,
      last_mastered: vocabulary.last_mastered,
      last_reviewed: vocabulary.last_reviewed,
      next_review: vocabulary.next_review,
      consecutive_correct: vocabulary.consecutive_correct || 0,
      consecutive_incorrect: vocabulary.consecutive_incorrect || 0,
      review_count: vocabulary.review_count || 0,
      ease_factor: vocabulary.ease_factor || 2.5
    };

    // For StudyGame: override mastery lowering based on consecutive incorrect tracking
    if (shouldLowerMastery && !isCorrect && currentMasteryLevel > 0) {
      // Force mastery level decrease when shouldLowerMastery flag is set
      currentMasteryLevel = Math.max(currentMasteryLevel - 1, 0);
      vocabularyData.mastery_level = currentMasteryLevel;
    }
    
    // Calculate new scheduling via SRS
    const srsResult = calculateSpacedRepetition({
      vocabulary_id: vocabularyId,
      user_id: userId,
      is_correct: isCorrect,
      vocabulary_data: vocabularyData
    });
    
    // If shouldLowerMastery was set, ensure the result reflects the forced decrease
    if (shouldLowerMastery && !isCorrect && vocabularyData.mastery_level >= 0) {
      srsResult.new_mastery_level = Math.min(srsResult.new_mastery_level, vocabularyData.mastery_level);
      srsResult.mastery_changed = true;
    }

    // Calculate mastery delta
    const masteryDelta = srsResult.new_mastery_level - currentMasteryLevel;
    
    // Update vocabulary with new mastery & review dates (only existing columns)
    const now = new Date().toISOString();
    const updateData: any = {
      updated_at: now,
    };
    
    // Only add columns that exist in the current schema
    try {
      // These may or may not exist depending on migration status
      updateData.last_reviewed = now;
      updateData.next_review = srsResult.next_review;
      updateData.review_count = (vocabulary.review_count || 0) + 1;
      updateData.ease_factor = vocabularyData.ease_factor;
    } catch (e) {
      console.log('Some update fields not available, continuing with basic update');
    }

    const { error: updateError } = await supabase
      .from('vocabularies')
      .update(updateData)
      .eq('id', vocabularyId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating vocabulary review:', updateError);
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    // Record study activity
    const studyActivityData = {
      vocabulary_id: vocabularyId,
      user_id: userId,
      activity_type: activityType,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs || null,
      user_answer: userAnswer || null,
      correct_answer: vocabulary.word,
      session_id: sessionId || null,
      created_at: now
    };

    const { error: studyError } = await supabase
      .from('study_activities')
      .insert(studyActivityData);

    if (studyError) {
      console.error('Error recording study activity:', studyError);
      // Don't fail the entire request for study activity errors
    }

    // Calculate days until next review
    const nextReviewDate = new Date(srsResult.next_review);
    const daysUntilReview = Math.ceil((nextReviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      message: "Review updated successfully",
      vocabulary: {
        ...vocabulary,
        ...updateData
      },
      masteryDelta,
      nextReview: srsResult.next_review,
      easeFactor: vocabularyData.ease_factor,
      nextReviewIn: `${daysUntilReview} day${daysUntilReview !== 1 ? 's' : ''}`,
      masteryLevel: srsResult.new_mastery_level,
      masteryChanged: srsResult.mastery_changed
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
