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

    // Get current vocabulary - handle both UUID and integer IDs
    const { data: vocabulary, error: fetchError } = await supabase
      .from('vocabularies')
      .select('id, word, meaning, difficulty, created_at, updated_at')
      .eq('id', vocabularyId) // Let Supabase handle the conversion
      .eq('user_id', userId)
      .single();

    if (fetchError || !vocabulary) {
      console.error('Error fetching vocabulary:', fetchError);
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
      );
    }

    // Simple update - just update the timestamp
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('vocabularies')
      .update({ updated_at: now })
      .eq('id', vocabularyId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating vocabulary:', updateError);
      return NextResponse.json(
        { error: "Failed to update vocabulary" },
        { status: 500 }
      );
    }

    // Calculate simple next review based on rating
    const daysUntilReview = rating === 1 ? 1 : rating === 2 ? 3 : 7;

    return NextResponse.json({
      message: "Review recorded successfully",
      rating,
      daysUntilReview,
      vocabulary: vocabulary.word
    });

  } catch (error) {
    console.error('Error in simple review:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
