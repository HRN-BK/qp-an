import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import OpenAI from "openai";
import { ENV } from "@/lib/env";
import * as crypto from "crypto";

// In-memory cache for generated sentences (keyed by vocabulary ID)
const sentenceCache = new Map<string, { data: any; expiry: number }>();

// Helper function to create cache key
function createCacheKey(vocabularyId: string): string {
  return `sentence-${vocabularyId}`;
}

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY || 'test-key' });
  try {
    // 1. Validate auth & inputs
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vocabularyId } = body;

    // Validate required inputs
    if (!vocabularyId) {
      return NextResponse.json(
        { error: "vocabularyId is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get vocabulary information
    const { data: vocabulary, error: fetchError } = await supabase
      .from('vocabularies')
      .select('id, word, meaning, definition, cefr_level')
      .eq('id', vocabularyId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !vocabulary) {
      console.error('Error fetching vocabulary:', fetchError);
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
      );
    }

    // Check cache first
    const cacheKey = createCacheKey(vocabularyId);
    const now = Date.now();
    const cached = sentenceCache.get(cacheKey);
    
    if (cached && cached.expiry > now) {
      return NextResponse.json(cached.data);
    }

    // 2. Build GPT prompt to generate a sentence with blank
    const prompt = `You are an English language teacher creating a fill-in-the-blank exercise.

Word: "${vocabulary.word}"
Meaning: "${vocabulary.meaning}"
${vocabulary.definition ? `Definition: "${vocabulary.definition}"` : ''}
CEFR Level: ${vocabulary.cefr_level}

Create a contextually appropriate sentence that uses this word, then replace the word with "______" to create a fill-in-the-blank exercise.

Requirements:
1. The sentence should be at an appropriate difficulty level for ${vocabulary.cefr_level} learners
2. The context should clearly hint at the target word
3. The sentence should be natural and realistic
4. The blank should be placed where the target word would naturally fit
5. The sentence should be 10-20 words long

Please respond with a JSON object in this exact format:
{
  "sentenceWithBlank": "The sentence with ______ in place of the word",
  "targetWord": "the original word",
  "context": "brief explanation of why this word fits in this context"
}`;

    // 3. Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful English language teacher. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7, // Slightly higher for creativity
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    let aiResponse;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      aiResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate AI response
    if (!aiResponse.sentenceWithBlank || !aiResponse.targetWord) {
      throw new Error("Invalid response format from AI");
    }

    // 4. Structure the response
    const response = {
      sentenceWithBlank: aiResponse.sentenceWithBlank,
      targetWord: aiResponse.targetWord,
      context: aiResponse.context || "Context-based fill-in-the-blank exercise"
    };

    // Cache the response for 24 hours to avoid regenerating too frequently
    sentenceCache.set(cacheKey, {
      data: response,
      expiry: now + (24 * 60 * 60 * 1000) // 24 hours
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in generate sentence API:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  sentenceCache.forEach((value, key) => {
    if (value.expiry <= now) {
      sentenceCache.delete(key);
    }
  });
}, 60 * 60 * 1000); // Clean up every hour
