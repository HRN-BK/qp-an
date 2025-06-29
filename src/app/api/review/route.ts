import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      vocabulary_id,
      review_type,
      score,
      time_spent_seconds,
      correct_answers,
      total_questions
    } = body;

    if (!vocabulary_id || !review_type) {
      return NextResponse.json(
        { error: "vocabulary_id and review_type are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create the review log entry
    const { data: review, error } = await supabase
      .from('review_logs')
      .insert({
        user_id: userId,
        vocabulary_id,
        review_type,
        score: score || 0,
        time_spent_seconds: time_spent_seconds || 0,
        correct_answers: correct_answers || 0,
        total_questions: total_questions || 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review log:', error);
      return NextResponse.json(
        { error: "Failed to create review log" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      id: review.id,
      message: "Review submitted successfully" 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
