import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import OpenAI from "openai";
import { ENV } from "@/lib/env";
import * as crypto from "crypto";

// In-memory cache for development (keyed by hash of sentence)
const cache = new Map<string, { data: any; expiry: number }>();

// Helper function to create hash of sentence for caching
function createSentenceHash(vocabularyId: string, mode: string, userSentence: string): string {
  return crypto.createHash('md5').update(`${vocabularyId}-${mode}-${userSentence.toLowerCase()}`).digest('hex');
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
    const { vocabularyId, mode, userSentence } = body;

    // Validate required inputs
    if (!vocabularyId || !mode || !userSentence) {
      return NextResponse.json(
        { error: "vocabularyId, mode, and userSentence are required" },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['context_write', 'context_fill'].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be either 'context_write' or 'context_fill'" },
        { status: 400 }
      );
    }

    // Validate sentence length (reasonable limits)
    if (userSentence.length < 3 || userSentence.length > 500) {
      return NextResponse.json(
        { error: "userSentence must be between 3 and 500 characters" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get vocabulary information
    const { data: vocabulary, error: fetchError } = await supabase
      .from('vocabularies')
      .select('id, word, meaning, definition')
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
    const cacheKey = createSentenceHash(vocabularyId, mode, userSentence);
    const now = Date.now();
    const cached = cache.get(cacheKey);
    
    if (cached && cached.expiry > now) {
      return NextResponse.json(cached.data);
    }

    // 2. Build GPT-4o-mini prompt to evaluate correctness, give suggestions, collocations, and numeric score
    const prompt = mode === 'context_write' 
      ? `You are an English language teacher evaluating a student's use of a vocabulary word in context. 

Word: "${vocabulary.word}"
Meaning: "${vocabulary.meaning}"
${vocabulary.definition ? `Definition: "${vocabulary.definition}"` : ''}

Student's sentence: "${userSentence}"

Please evaluate the student's usage and provide feedback in the following JSON format:
{
  "score": <number 1-10>,
  "feedback": "<detailed feedback about correctness and usage>",
  "suggestions": [
    "<suggestion 1>",
    "<suggestion 2>",
    "<suggestion 3>"
  ],
  "collocations": [
    "<common collocation 1>",
    "<common collocation 2>",
    "<common collocation 3>"
  ]
}

Evaluation criteria:
- Score 1-3: Incorrect usage, grammatical errors, or word used inappropriately
- Score 4-6: Partially correct but could be improved, minor grammatical issues
- Score 7-8: Good usage with minor suggestions for improvement
- Score 9-10: Excellent usage, natural and contextually appropriate

Focus on:
1. Whether the word is used correctly in context
2. Grammar and sentence structure
3. Natural language flow
4. Appropriateness of context

Provide constructive feedback and practical suggestions for improvement. Include common collocations that would help the student use this word more naturally.`
      : `You are an English language teacher evaluating a student's sentence completion exercise.

Word: "${vocabulary.word}"
Meaning: "${vocabulary.meaning}"
${vocabulary.definition ? `Definition: "${vocabulary.definition}"` : ''}

Student's completed sentence: "${userSentence}"

Please evaluate whether the student correctly filled in the blank with the target word and provide feedback in the following JSON format:
{
  "score": <number 1-10>,
  "feedback": "<detailed feedback about correctness and appropriateness>",
  "suggestions": [
    "<suggestion 1>",
    "<suggestion 2>",
    "<suggestion 3>"
  ],
  "collocations": [
    "<common collocation 1>",
    "<common collocation 2>",
    "<common collocation 3>"
  ]
}

Evaluation criteria:
- Score 1-3: Word choice is incorrect or doesn't fit the context
- Score 4-6: Word fits but usage could be more natural or appropriate
- Score 7-8: Good word choice with natural usage
- Score 9-10: Perfect word choice, natural and contextually excellent

Focus on:
1. Whether the target word fits naturally in the sentence
2. Contextual appropriateness
3. Grammar and coherence
4. Natural language usage

Provide helpful feedback and suggest ways to use this word more effectively. Include common collocations to help the student understand typical usage patterns.`;

    // 3. Call OpenAI API and parse JSON response
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
      temperature: 0.3,
      max_tokens: 800,
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

    // Validate and sanitize AI response
    const score = Math.max(1, Math.min(10, parseInt(aiResponse.score) || 5));
    const feedback = aiResponse.feedback || "Unable to provide feedback at this time.";
    const suggestions = Array.isArray(aiResponse.suggestions) 
      ? aiResponse.suggestions.slice(0, 5) 
      : [];
    const collocations = Array.isArray(aiResponse.collocations) 
      ? aiResponse.collocations.slice(0, 5) 
      : [];

    // Combine suggestions and collocations for storage
    const allSuggestions = {
      suggestions: suggestions,
      collocations: collocations
    };

    // 4. Persist to ContextFeedback
    const { data: contextFeedback, error: insertError } = await supabase
      .from('context_feedback')
      .insert({
        user_id: userId,
        vocabulary_id: vocabularyId,
        mode: mode,
        user_sentence: userSentence,
        ai_score: score,
        ai_feedback: feedback,
        suggestions: allSuggestions
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting context feedback:', insertError);
      // Continue with response even if DB insert fails
    }

    // 5. Return structured JSON response
    const response = {
      score: score,
      feedback: feedback,
      suggestions: {
        improvements: suggestions,
        collocations: collocations
      }
    };

    // Cache the response for 1 hour to avoid duplicate calls during dev
    cache.set(cacheKey, {
      data: response,
      expiry: now + (60 * 60 * 1000) // 1 hour
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in AI feedback API:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  cache.forEach((value, key) => {
    if (value.expiry <= now) {
      cache.delete(key);
    }
  });
}, 30 * 60 * 1000); // Clean up every 30 minutes
