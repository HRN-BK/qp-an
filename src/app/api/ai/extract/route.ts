import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  let passage = ''; // Declare at function scope
  
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    passage = body.passage; // Assign to function-scoped variable

    if (!passage || typeof passage !== "string") {
      return NextResponse.json(
        { error: "Passage is required" },
        { status: 400 }
      );
    }

    const prompt = `Extract vocabulary words from the following passage that would be useful for English learners. For each word, provide:
- word: the exact word from the passage
- meaning: Vietnamese translation
- definition: English definition
- pronunciation: IPA
- part_of_speech: noun, verb, adjective, adverb, etc.
- difficulty: CEFR level (A1, A2, B1, B2, C1, C2)
- tags: relevant tags
- synonyms: synonyms in English
- antonyms: antonyms in English
- collocations: common collocations with the word

Focus on words that are:
- Intermediate to advanced level
- Not basic words like "the", "and", "is"
- Useful for vocabulary building
- Present in the given passage

Return a JSON array with maximum 10 words.

Passage: "${passage}"

Response format:
{
  "words": [
    {
      "word": "example",
      "meaning": "ví dụ",
      "definition": "a thing characteristic of its kind or illustrating a general rule",
      "pronunciation": "/ɪɡˈzæmpəl/",
      "part_of_speech": "noun",
      "difficulty": "B1",
      "tags": ["Common", "Academic"],
      "synonyms": ["sample", "case"],
      "antonyms": ["counterexample"],
      "collocations": ["for example", "as an example"]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful English vocabulary extraction assistant. Extract useful vocabulary words from passages and provide Vietnamese meanings and English definitions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error("No response from AI");
    }

    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = response.trim();
      
      // Remove ```json and ``` markers
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
      
      const parsedResponse = JSON.parse(cleanedResponse);
      
      if (!parsedResponse.words || !Array.isArray(parsedResponse.words)) {
        throw new Error("Invalid response format");
      }

      // Validate each word object
      const validWords = parsedResponse.words.filter((word: any) => 
        word.word && 
        word.meaning && 
        word.definition && 
        typeof word.word === "string" &&
        typeof word.meaning === "string" &&
        typeof word.definition === "string"
      );

      return NextResponse.json({
        words: validWords,
        message: `Extracted ${validWords.length} vocabulary words`
      });

    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("AI Response was:", response);
      
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error extracting vocabulary:", error);
    
    // If OpenAI quota exceeded, return mock data
    if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
      console.log('OpenAI quota exceeded, using mock data');
      
      // Simple word extraction as fallback
      const words = passage
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4 && !['the', 'and', 'that', 'this', 'with', 'from', 'they', 'have', 'were', 'been', 'their', 'said', 'each', 'which', 'what', 'there', 'would', 'could', 'should'].includes(word))
        .slice(0, 8);
      
      const cefrLevels = ['A2', 'B1', 'B2', 'C1'];
      const mockWords = words.map(word => ({
        word: word,
        meaning: `nghĩa của ${word}`,
        definition: `Definition of ${word} would be provided by AI`,
        pronunciation: `/${word}/`,
        part_of_speech: "unknown",
        difficulty: cefrLevels[Math.floor(Math.random() * cefrLevels.length)],
        tags: ["Extracted"],
        synonyms: [],
        antonyms: [],
        collocations: []
      }));
      
      return NextResponse.json({
        words: mockWords,
        message: `Extracted ${mockWords.length} vocabulary words (fallback mode)`
      });
    }
    
    return NextResponse.json(
      { error: "Failed to extract vocabulary" },
      { status: 500 }
    );
  }
}
