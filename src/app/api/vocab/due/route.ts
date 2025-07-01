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
    const includeNextReviews = searchParams.get('next_reviews') === 'true';
    const supabase = createServiceClient();

    // If requesting next review times
    if (includeNextReviews) {
      const { data: nextReviews, error: nextError } = await supabase
        .from('vocabularies')
        .select('next_review')
        .eq('user_id', userId)
        .not('next_review', 'is', null)
        .gt('next_review', new Date().toISOString())
        .order('next_review', { ascending: true })
        .limit(10);

      if (nextError) {
        console.error('Error fetching next reviews:', nextError);
        return NextResponse.json({ error: 'Failed to fetch next reviews' }, { status: 500 });
      }

      // Group by next_review time and calculate hours until
      const reviewGroups = new Map();
      const now = new Date();

      nextReviews?.forEach(vocab => {
        const reviewTime = new Date(vocab.next_review);
        const timeKey = reviewTime.toISOString();
        
        if (!reviewGroups.has(timeKey)) {
          const hoursUntil = (reviewTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          reviewGroups.set(timeKey, {
            next_review: vocab.next_review,
            count: 0,
            hours_until: Math.max(0, hoursUntil)
          });
        }
        reviewGroups.get(timeKey).count++;
      });

      const nextReviewsList = Array.from(reviewGroups.values())
        .sort((a, b) => a.hours_until - b.hours_until);

      return NextResponse.json({ 
        next_reviews: nextReviewsList,
        vocabularies: []
      });
    }

    // Get vocabularies that are due for review
    const now = new Date();
    // Query all available columns now that migration is complete
    let { data: vocabularies, error } = await supabase
      .from('vocabularies')
      .select(`
        id, word, meaning, definition, pronunciation, part_of_speech, 
        difficulty, cefr_level, created_at, review_count, ease_factor, 
        next_review, last_reviewed, mastery_level, last_mastered, 
        consecutive_correct, consecutive_incorrect, pronunciation_ipa, 
        audio_url, example, synonyms, antonyms, collocations
      `)
      .eq('user_id', userId)
      .or(`next_review.is.null,next_review.lte.${now.toISOString()}`)
      .order('next_review', { ascending: true, nullsFirst: true })
      .limit(20); // Limit to 20 cards per session

    if (error) {
      console.error('Error fetching due vocabularies:', error);
      return NextResponse.json(
        { error: "Failed to fetch vocabularies" },
        { status: 500 }
      );
    }

    // Get synonyms and antonyms for each vocabulary
    const vocabularyIds = vocabularies?.map(v => v.id) || [];
    
    let synonymsData = [];
    let antonymsData = [];
    
    if (vocabularyIds.length > 0) {
      const { data: synonyms } = await supabase
        .from('synonyms')
        .select('vocabulary_id, synonym_text')
        .in('vocabulary_id', vocabularyIds);
      
      const { data: antonyms } = await supabase
        .from('antonyms')
        .select('vocabulary_id, antonym_text')
        .in('vocabulary_id', vocabularyIds);
        
      synonymsData = synonyms || [];
      antonymsData = antonyms || [];
    }

    // Initialize review fields for new vocabularies and attach synonyms/antonyms
    const processedVocabularies = vocabularies?.map(vocab => ({
      ...vocab,
      review_count: vocab.review_count || 0,
      ease_factor: vocab.ease_factor || 2.5, // Default ease factor
      next_review: vocab.next_review,
      cefr_level: vocab.cefr_level || 'A1',
      mastery_level: vocab.mastery_level || 0,
      example: vocab.example || `This is an example sentence with ${vocab.word}.`,
      synonyms: synonymsData.filter(s => s.vocabulary_id === vocab.id),
      antonyms: antonymsData.filter(a => a.vocabulary_id === vocab.id)
    })) || [];

    return NextResponse.json({
      vocabularies: processedVocabularies,
      count: processedVocabularies.length,
      message: `Found ${processedVocabularies.length} vocabularies due for review`
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
