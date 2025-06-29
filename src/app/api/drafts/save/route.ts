import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface DraftItem {
  word: string;
  meaning: string;
  definition: string;
  part_of_speech?: string;
  difficulty?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { drafts } = body;

    if (!drafts || !Array.isArray(drafts) || drafts.length === 0) {
      return NextResponse.json(
        { error: "Drafts array is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const results = [];

    // Process each draft
    for (const draft of drafts) {
      const { word, meaning, definition, part_of_speech, difficulty } = draft as DraftItem;

      if (!word || !meaning) {
        console.warn(`Skipping draft with missing word or meaning:`, draft);
        continue;
      }

      try {
        // Check if vocabulary already exists
        const { data: existingVocab } = await supabase
          .from('vocabularies')
          .select('id')
          .eq('user_id', userId)
          .eq('word', word)
          .single();

        if (existingVocab) {
          console.warn(`Vocabulary "${word}" already exists, skipping`);
          continue;
        }

        // Create the vocabulary entry
        const { data: vocabulary, error: vocabError } = await supabase
          .from('vocabularies')
          .insert({
            user_id: userId,
            word,
            part_of_speech,
            difficulty,
          })
          .select()
          .single();

        if (vocabError) {
          console.error(`Error creating vocabulary "${word}":`, vocabError);
          continue;
        }

        // Create the meaning entry
        const { error: meaningError } = await supabase
          .from('vocabulary_meanings')
          .insert({
            vocabulary_id: vocabulary.id,
            meaning,
            example_sentence: definition,
          });

        if (meaningError) {
          console.error(`Error creating meaning for "${word}":`, meaningError);
          // Continue anyway as the vocabulary was created
        }

        results.push({
          word,
          id: vocabulary.id,
          status: 'created'
        });

      } catch (error) {
        console.error(`Error processing draft "${word}":`, error);
        results.push({
          word,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'created').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      message: `Successfully saved ${successCount} vocabularies`,
      success_count: successCount,
      failed_count: failedCount,
      results
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
