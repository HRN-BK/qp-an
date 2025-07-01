import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ENV } from "@/lib/env";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

// In-memory cache for development (in production, use Redis or similar)
const cache = new Map<string, { data: any; expiry: number }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json(
        { error: "Word parameter is required" },
        { status: 400 }
      );
    }

    const cacheKey = `ai_suggest_${word.toLowerCase()}`;
    const now = Date.now();

    // Check cache first (1 day expiry)
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return NextResponse.json(cached.data);
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a comprehensive English-Vietnamese dictionary assistant. When given an English word, provide detailed vocabulary information in JSON format. Always respond with valid JSON containing these exact keys:
          - "meaning": The Vietnamese translation/meaning of the word (in Vietnamese)
          - "definition": A detailed English definition and explanation (in English)
          - "pronunciation": IPA phonetic transcription of the word (e.g., /wɜːrd/)
          - "part_of_speech": The grammatical category (noun, verb, adjective, adverb, etc.)
          - "cefr_level": CEFR difficulty level (A1, A2, B1, B2, C1, C2)
          - "tags": An array of relevant category tags (e.g., ["Academic", "Business", "Everyday"])
          - "synonyms": An array of English synonyms
          - "antonyms": An array of English antonyms
          - "collocations": An array of common English phrases or collocations with this word
          - "examples": An array of exactly 3 natural English example sentences using the word
          - "other_meanings": An array of alternative Vietnamese meanings (in Vietnamese)
          
          Important rules:
          - "meaning" MUST be in Vietnamese language
          - "definition" MUST be in English language with detailed explanation
          - "other_meanings" MUST be in Vietnamese language
          - "pronunciation" should be in IPA format
          - "cefr_level" should be one of: A1, A2, B1, B2, C1, C2
          - "tags" should be relevant categories in English
          - "synonyms", "antonyms", "collocations" should be in English
          - Focus on accuracy and educational value
          - If the word has multiple common meanings, prioritize the most frequently used one for the main meaning`
        },
        {
          role: "user",
          content: `Give me Vietnamese meaning and English definition for the English word: "${word}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
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

    // Validate response structure and provide comprehensive data
    const response = {
      meaning: aiResponse.meaning || "No meaning provided",
      definition: aiResponse.definition || "No definition provided",
      pronunciation: aiResponse.pronunciation || "",
      part_of_speech: aiResponse.part_of_speech || "",
      cefr_level: aiResponse.cefr_level || "B1",
      tags: Array.isArray(aiResponse.tags) ? aiResponse.tags : [],
      synonyms: Array.isArray(aiResponse.synonyms) ? aiResponse.synonyms : [],
      antonyms: Array.isArray(aiResponse.antonyms) ? aiResponse.antonyms : [],
      collocations: Array.isArray(aiResponse.collocations) ? aiResponse.collocations : [],
      other_meanings: Array.isArray(aiResponse.other_meanings) 
        ? aiResponse.other_meanings 
        : []
    };

    // Cache the response for 1 day
    cache.set(cacheKey, {
      data: response,
      expiry: now + (24 * 60 * 60 * 1000) // 1 day
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error in AI suggest API:", error);
    
    // Return a fallback response instead of error
    return NextResponse.json({
      meaning: "Unable to get AI suggestion at this time",
      definition: "Please try again later or enter the meaning manually",
      pronunciation: "",
      part_of_speech: "",
      cefr_level: "B1",
      tags: [],
      synonyms: [],
      antonyms: [],
      collocations: [],
      other_meanings: []
    });
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expiry <= now) {
      cache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour
