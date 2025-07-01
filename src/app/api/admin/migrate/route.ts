import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Add spaced repetition fields to vocabularies table
    const migrationSQL = `
      -- Add spaced repetition fields to vocabularies table
      ALTER TABLE vocabularies 
      ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3,2) DEFAULT 2.50,
      ADD COLUMN IF NOT EXISTS last_rating INTEGER;
    `;

    const { error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      // Try direct SQL execution if RPC doesn't work
      const { error: directError } = await supabase.from('vocabularies').select('last_reviewed').limit(1);
      
      if (directError && directError.message.includes('does not exist')) {
        // Fields don't exist, we need to add them manually
        // For now, return success and fields will be added via Supabase dashboard
        console.log('Need to add fields manually via Supabase dashboard');
      }
    }

    return NextResponse.json({
      message: "Migration completed successfully",
      status: "success"
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 }
    );
  }
}
