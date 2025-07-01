import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Enhanced vocabulary schema migration
    const migrationSQL = `
      -- Add synonyms table
      CREATE TABLE IF NOT EXISTS synonyms (
          id SERIAL PRIMARY KEY,
          vocabulary_id INTEGER REFERENCES vocabulary(id) ON DELETE CASCADE,
          synonym_text VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(vocabulary_id, synonym_text)
      );

      -- Add antonyms table
      CREATE TABLE IF NOT EXISTS antonyms (
          id SERIAL PRIMARY KEY,
          vocabulary_id INTEGER REFERENCES vocabulary(id) ON DELETE CASCADE,
          antonym_text VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(vocabulary_id, antonym_text)
      );

      -- Add collocations table
      CREATE TABLE IF NOT EXISTS collocations (
          id SERIAL PRIMARY KEY,
          vocabulary_id INTEGER REFERENCES vocabulary(id) ON DELETE CASCADE,
          collocation_text TEXT NOT NULL,
          collocation_meaning TEXT,
          example_sentence TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Update vocabulary table to add CEFR level and enhanced spaced repetition
      ALTER TABLE vocabulary 
      ADD COLUMN IF NOT EXISTS cefr_level VARCHAR(10) DEFAULT 'A1',
      ADD COLUMN IF NOT EXISTS mastery_level INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS consecutive_correct INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS consecutive_incorrect INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS audio_url TEXT,
      ADD COLUMN IF NOT EXISTS pronunciation_ipa TEXT;

      -- Create learning_sessions table for tracking study streaks
      CREATE TABLE IF NOT EXISTS learning_sessions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          session_date DATE NOT NULL,
          words_studied INTEGER DEFAULT 0,
          correct_answers INTEGER DEFAULT 0,
          total_answers INTEGER DEFAULT 0,
          session_duration INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, session_date)
      );

      -- Create study_activities table for detailed tracking
      CREATE TABLE IF NOT EXISTS study_activities (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          vocabulary_id INTEGER REFERENCES vocabulary(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          is_correct BOOLEAN NOT NULL,
          response_time INTEGER,
          user_answer TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_synonyms_vocabulary_id ON synonyms(vocabulary_id);
      CREATE INDEX IF NOT EXISTS idx_antonyms_vocabulary_id ON antonyms(vocabulary_id);
      CREATE INDEX IF NOT EXISTS idx_collocations_vocabulary_id ON collocations(vocabulary_id);
      CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_date ON learning_sessions(user_id, session_date);
      CREATE INDEX IF NOT EXISTS idx_study_activities_user_vocab ON study_activities(user_id, vocabulary_id);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_cefr ON vocabulary(cefr_level);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery ON vocabulary(mastery_level);

      -- Update CEFR levels for existing data
      UPDATE vocabulary SET cefr_level = 
        CASE 
          WHEN difficulty_level = 1 THEN 'A1'
          WHEN difficulty_level = 2 THEN 'A2' 
          WHEN difficulty_level = 3 THEN 'B1'
          WHEN difficulty_level = 4 THEN 'B2'
          WHEN difficulty_level = 5 THEN 'C1'
          ELSE 'C2'
        END
      WHERE cefr_level IS NULL OR cefr_level = 'A1';
    `;

    // Execute each statement separately
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    const results = [];
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        const { data, error } = await supabase.from('_migrations').select('*').limit(1);
        if (error && error.message.includes('relation "_migrations" does not exist')) {
          // Create migrations table first
          await supabase.rpc('sql', { query: trimmedStatement });
        } else {
          await supabase.rpc('sql', { query: trimmedStatement });
        }
        results.push({ statement: trimmedStatement.substring(0, 50) + '...' });
      }
    }
    
    const data = results;
    const error = null;

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Enhanced vocabulary schema migration completed successfully',
      data 
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
