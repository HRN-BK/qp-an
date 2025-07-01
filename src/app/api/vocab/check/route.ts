import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json(
        { error: "Word parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if vocabulary already exists
    const { data: existingVocab, error } = await supabase
      .from('vocabularies')
      .select('id')
      .eq('user_id', userId)
      .eq('word', word.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking vocabulary:', error);
      return NextResponse.json(
        { error: "Failed to check vocabulary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!existingVocab,
      word: word
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
