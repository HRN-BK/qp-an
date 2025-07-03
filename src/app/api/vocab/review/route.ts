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
    const { vocabularyId, rating, isCorrect, masteryLevel, sessionId, activityType = 'flashcard', responseTimeMs, userAnswer, shouldLowerMastery, score } = body;

    // For flashcard system, use rating (1=hard, 2=good, 3=easy)
    // For game system, determine review correctness and quality
    let reviewIsCorrect = isCorrect;
    let quality: number | undefined;
    
    if (rating !== undefined) {
      reviewIsCorrect = rating >= 2; // Good (2) and Easy (3) are considered correct
    } else if (score !== undefined) {
      // Map 1-10 to 1-5 scale (1-2=1, 3-4=2, 5-6=3, 7-8=4, 9-10=5)
      quality = Math.min(5, Math.ceil(score / 2));
      reviewIsCorrect = quality >= 3;
    }

    // Validate required fields
    if (!vocabularyId || (rating === undefined && isCorrect === undefined)) {
      return NextResponse.json(
        { error: "Valid vocabulary ID and rating or isCorrect are required" },
        { status: 400 }
      );
    }
    
    // For simple integer IDs (not UUIDs)
    const numericVocabId = parseInt(vocabularyId);
    if (isNaN(numericVocabId)) {
      return NextResponse.json(
        { error: "Invalid vocabulary ID format" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get current vocabulary data (only basic fields)
    const { data: vocabulary, error: fetchError } = await supabase
      .from('vocabularies')
      .select('*')
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
    // or very low quality scores from new modes
    let forceLowerMastery = false;
    if (shouldLowerMastery && !reviewIsCorrect && currentMasteryLevel > 0) {
      forceLowerMastery = true;
    } else if (quality !== undefined && quality <= 2 && currentMasteryLevel > 0) {
      // New modes: immediately lower mastery for very poor quality (1-2)
      forceLowerMastery = true;
    }
    
    if (forceLowerMastery) {
      // Force mastery level decrease
      currentMasteryLevel = Math.max(currentMasteryLevel - 1, 0);
      vocabularyData.mastery_level = currentMasteryLevel;
    }
    
    // Calculate new scheduling via SRS
    const srsResult = calculateSpacedRepetition({
      vocabulary_id: vocabularyId,
      user_id: userId,
      is_correct: reviewIsCorrect, // Use the determined correctness
      vocabulary_data: vocabularyData,
      quality: quality // Pass quality for enhanced SM2 algorithm when available
    });
    
    // If mastery was forcibly lowered, ensure the result reflects the forced decrease
    if (forceLowerMastery && vocabularyData.mastery_level >= 0) {
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
      is_correct: reviewIsCorrect,
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
