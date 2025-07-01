import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

interface DraftItem {
  word: string;
  meaning: string;
  definition: string;
  pronunciation?: string;
  part_of_speech?: string;
  difficulty?: string; // CEFR level
  tags?: string[];
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
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

    const supabase = createServiceClient();
    const results = [];

    // Process each draft
    for (const draft of drafts) {
      const { 
        word, 
        meaning, 
        definition, 
        pronunciation,
        part_of_speech, 
        difficulty,
        tags = [],
        synonyms = [],
        antonyms = [],
        collocations = []
      } = draft as DraftItem;

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

        // Create the vocabulary entry with comprehensive data
        // Convert CEFR level to integer if needed
        let difficultyValue = difficulty;
        if (typeof difficulty === 'string') {
          const cefrToNumber: { [key: string]: number } = {
            'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 5
          };
          difficultyValue = cefrToNumber[difficulty] || 3;
        }
        
        const vocabularyData: any = {
          user_id: userId,
          word,
          meaning,
          definition,
          pronunciation,
          part_of_speech,
          difficulty: difficultyValue,
        };
        
        // Add CEFR level if it's a string
        if (typeof difficulty === 'string') {
          vocabularyData.cefr_level = difficulty;
        }
        
        // Only add extended fields if they exist
        try {
          vocabularyData.synonyms = synonyms;
          vocabularyData.antonyms = antonyms;
          vocabularyData.collocations = collocations;
        } catch (e) {
          console.log('Extended fields not available, continuing without them');
        }

        const { data: vocabulary, error: vocabError } = await supabase
          .from('vocabularies')
          .insert(vocabularyData)
          .select()
          .single();

        if (vocabError) {
          console.error(`Error creating vocabulary "${word}":`, vocabError);
          continue;
        }

        // Handle tags if provided
        if (tags && Array.isArray(tags) && tags.length > 0) {
          // First, create or get existing tags
          const tagPromises = tags.map(async (tagName: string) => {
            // Try to get existing tag first
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('user_id', userId)
              .eq('name', tagName)
              .single();

            if (existingTag) {
              return existingTag.id;
            }

            // Create new tag if it doesn't exist
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                user_id: userId,
                name: tagName,
              })
              .select('id')
              .single();

            if (tagError) {
              console.error('Error creating tag:', tagError);
              return null;
            }

            return newTag.id;
          });

          const tagIds = (await Promise.all(tagPromises)).filter(Boolean);

          // Create vocabulary-tag associations
          if (tagIds.length > 0) {
            const vocabularyTags = tagIds.map(tagId => ({
              vocabulary_id: vocabulary.id,
              tag_id: tagId,
            }));

            const { error: tagAssocError } = await supabase
              .from('vocabulary_tags')
              .insert(vocabularyTags);

            if (tagAssocError) {
              console.error('Error creating tag associations:', tagAssocError);
            }
          }
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
