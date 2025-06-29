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
      word,
      pronunciation,
      part_of_speech,
      meaning,
      definition,
      difficulty,
      notes,
      tags = []
    } = body;

    if (!word || !meaning) {
      return NextResponse.json(
        { error: "Word and meaning are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Start a transaction-like operation
    // First, create the vocabulary entry
    const { data: vocabulary, error: vocabError } = await supabase
      .from('vocabularies')
      .insert({
        user_id: userId,
        word,
        pronunciation,
        part_of_speech,
        difficulty,
        notes,
      })
      .select()
      .single();

    if (vocabError) {
      console.error('Error creating vocabulary:', vocabError);
      return NextResponse.json(
        { error: "Failed to create vocabulary" },
        { status: 500 }
      );
    }

    // Create the main meaning entry
    const { error: meaningError } = await supabase
      .from('vocabulary_meanings')
      .insert({
        vocabulary_id: vocabulary.id,
        meaning,
        example_sentence: definition, // Using definition as example for now
      });

    if (meaningError) {
      console.error('Error creating meaning:', meaningError);
      // Could rollback vocabulary creation here in a real transaction
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
