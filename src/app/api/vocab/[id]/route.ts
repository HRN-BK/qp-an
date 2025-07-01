import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { userId } = await auth();
    const { id } = await params;

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

    const supabase = createServerClient();

    // Update the vocabulary entry
    const { error: vocabError } = await supabase
      .from('vocabularies')
      .update({
        word,
        pronunciation,
        part_of_speech,
        difficulty,
        notes,
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (vocabError) {
      console.error('Error updating vocabulary:', vocabError);
      return NextResponse.json(
        { error: "Failed to update vocabulary" },
        { status: 500 }
      );
    }

    // Update the main meaning entry (only first meaning)
    const { data: existingMeanings } = await supabase
      .from('vocabulary_meanings')
      .select('id')
      .eq('vocabulary_id', id)
      .limit(1);

    if (existingMeanings && existingMeanings.length > 0) {
      const { error: meaningError } = await supabase
        .from('vocabulary_meanings')
        .update({
          meaning,
          example_sentence: definition,
        })
        .eq('id', existingMeanings[0].id);

      if (meaningError) {
        console.error('Error updating meaning:', meaningError);
      }
    }

    // Handle tags (remove all existing and re-add)
    const { error: tagDeleteError } = await supabase
      .from('vocabulary_tags')
      .delete()
      .eq('vocabulary_id', id);

    if (tagDeleteError) {
      console.error('Error deleting old tag associations:', tagDeleteError);
    }

    // Re-add tags if provided
    if (tags.length > 0) {
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
          vocabulary_id: id,
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

    return NextResponse.json({ message: "Vocabulary updated successfully" });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Delete the vocabulary (cascading will handle related data)
    const { error } = await supabase
      .from('vocabularies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting vocabulary:', error);
      return NextResponse.json(
        { error: "Failed to delete vocabulary" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Vocabulary deleted successfully" });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
