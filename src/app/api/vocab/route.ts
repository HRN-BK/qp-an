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
    const {
      word,
      pronunciation,
      part_of_speech,
      meaning,
      definition,
      difficulty,
      notes,
      tags = [],
      synonyms = [],
      antonyms = [],
      collocations = []
    } = body;

    if (!word || !meaning) {
      return NextResponse.json(
        { error: "Word and meaning are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Create the vocabulary entry - handle missing columns gracefully
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
      notes,
    };
    
    // Add CEFR level if it's a string
    if (typeof difficulty === 'string') {
      vocabularyData.cefr_level = difficulty;
    }
    
    // Only add these fields if they exist in the schema
    try {
      vocabularyData.synonyms = synonyms;
      vocabularyData.antonyms = antonyms;
      vocabularyData.collocations = collocations;
    } catch (e) {
      // Columns don't exist yet, that's fine
      console.log('Extended vocabulary fields not available yet');
    }

    const { data: vocabulary, error: vocabError } = await supabase
      .from('vocabularies')
      .insert(vocabularyData)
      .select()
      .single();

    if (vocabError) {
      console.error('Error creating vocabulary:', vocabError);
      return NextResponse.json(
        { error: "Failed to create vocabulary" },
        { status: 500 }
      );
    }

    // Handle tags if provided
    if (tags.length > 0) {
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

    return NextResponse.json({ 
      id: vocabulary.id,
      message: "Vocabulary created successfully" 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
