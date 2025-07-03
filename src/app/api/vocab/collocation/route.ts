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
    const { vocabularyId, text } = body;

    if (!vocabularyId || !text) {
      return NextResponse.json(
        { error: "vocabularyId and text are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify the vocabulary belongs to the user
    const { data: vocabulary, error: vocabError } = await supabase
      .from('vocabularies')
      .select('id')
      .eq('id', vocabularyId)
      .eq('user_id', userId)
      .single();

    if (vocabError || !vocabulary) {
      return NextResponse.json(
        { error: "Vocabulary not found or not accessible" },
        { status: 404 }
      );
    }

    // Upsert the collocation (insert or update if exists)
    const { data: collocation, error: upsertError } = await supabase
      .from('collocations')
      .upsert(
        {
          vocabulary_id: vocabularyId,
          text: text,
        },
        {
          onConflict: 'vocabulary_id,text',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting collocation:', upsertError);
      return NextResponse.json(
        { error: "Failed to save collocation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      id: collocation.id
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
