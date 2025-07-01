import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    console.log('🚀 Adding missing columns to vocabularies table...');
    
    // Test adding one column at a time using a workaround
    // Since we can't run DDL directly, we'll check if columns exist by trying to select them
    
    const testQueries = [
      'cefr_level',
      'pronunciation_ipa', 
      'audio_url',
      'example',
      'mastery_level',
      'last_mastered'
    ];
    
    const results = [];
    
    for (const column of testQueries) {
      try {
        // Try to select the column to see if it exists
        const { data, error } = await supabase
          .from('vocabularies')
          .select(column)
          .limit(1);
        
        if (error) {
          results.push({
            column,
            exists: false,
            error: error.message
          });
        } else {
          results.push({
            column,
            exists: true
          });
        }
      } catch (err) {
        results.push({
          column,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    
    // Check if synonyms and antonyms tables exist
    const tableChecks = ['synonyms', 'antonyms'];
    
    for (const table of tableChecks) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          results.push({
            table,
            exists: false,
            error: error.message
          });
        } else {
          results.push({
            table,
            exists: true
          });
        }
      } catch (err) {
        results.push({
          table,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      message: 'Schema check completed',
      results
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
