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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a comprehensive dictionary assistant. When given a word, provide detailed vocabulary information in JSON format. Always respond with valid JSON containing these exact keys:
          - "meaning": A concise, clear definition of the word's primary meaning
          - "definition": A more detailed explanation with context
          - "other_meanings": An array of alternative meanings or uses of the word
          
          Focus on accuracy and educational value. If the word has multiple common meanings, prioritize the most frequently used one for the main meaning.`
        },
        {
          role: "user",
          content: `Give me detailed vocabulary information for the word: "${word}"`
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
      aiResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate response structure
    const response = {
      meaning: aiResponse.meaning || "No meaning provided",
      definition: aiResponse.definition || "No definition provided", 
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
