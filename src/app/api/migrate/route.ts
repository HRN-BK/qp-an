import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Check if fields already exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('vocabularies')
      .select('review_count, ease_factor, next_review, last_reviewed')
      .limit(1);

    if (!testError) {
      return NextResponse.json({
        message: "Spaced repetition fields already exist",
        fieldsExist: true
      });
    }

    // Fields don't exist, let's add them using raw SQL
    const migrationSQL = `
      -- Add spaced repetition fields to vocabularies table
      ALTER TABLE vocabularies 
      ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3,2) DEFAULT 2.50,
      ADD COLUMN IF NOT EXISTS last_rating INTEGER;

      -- Create indexes for efficient querying
      CREATE INDEX IF NOT EXISTS idx_vocabularies_next_review 
      ON vocabularies(user_id, next_review) 
      WHERE next_review IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_vocabularies_never_reviewed 
      ON vocabularies(user_id, created_at) 
      WHERE next_review IS NULL;
    `;

    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      console.error('Migration error:', migrationError);
      return NextResponse.json(
        { error: "Failed to run migration", details: migrationError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Migration completed successfully",
      fieldsAdded: true
    });

  } catch (error) {
    console.error('Unexpected migration error:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
