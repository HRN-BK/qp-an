-- Manual migration to run in Supabase SQL Editor
-- Run these statements one by one in Supabase Dashboard > SQL Editor

-- 1. Add missing columns to vocabularies table
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS cefr_level TEXT DEFAULT 'A1',
ADD COLUMN IF NOT EXISTS pronunciation_ipa TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS example TEXT;

-- 2. Add spaced repetition fields
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3,2) DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS last_rating INTEGER;

-- 3. Add mastery tracking fields
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS mastery_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_mastered TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_correct INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_incorrect INTEGER DEFAULT 0;

-- 4. Add vocabulary extensions
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS synonyms TEXT[],
ADD COLUMN IF NOT EXISTS antonyms TEXT[],
ADD COLUMN IF NOT EXISTS collocations TEXT[];

-- 5. Create synonyms table
CREATE TABLE IF NOT EXISTS synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  synonym_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create antonyms table
CREATE TABLE IF NOT EXISTS antonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  antonym_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create study_activities table
CREATE TABLE IF NOT EXISTS study_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'flashcard',
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  user_answer TEXT,
  correct_answer TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create session_summaries table
CREATE TABLE IF NOT EXISTS session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'study',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  words_studied INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  average_response_time_ms INTEGER,
  session_duration_seconds INTEGER,
  tags_studied TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Enable RLS on new tables
ALTER TABLE synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE antonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (run these only if policies don't exist)
-- If policy already exists, skip or drop first with: DROP POLICY IF EXISTS "policy_name" ON table_name;

CREATE POLICY "user_owns_synonyms" ON synonyms
  FOR ALL USING (
    vocabulary_id IN (
      SELECT id FROM vocabularies WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "user_owns_antonyms" ON antonyms
  FOR ALL USING (
    vocabulary_id IN (
      SELECT id FROM vocabularies WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "user_owns_study_activities" ON study_activities
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "user_owns_session_summaries" ON session_summaries
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocabularies_cefr_level ON vocabularies(cefr_level);
CREATE INDEX IF NOT EXISTS idx_vocabularies_mastery_level ON vocabularies(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocabularies_next_review ON vocabularies(user_id, next_review) 
  WHERE next_review IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_synonyms_vocabulary_id ON synonyms(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_antonyms_vocabulary_id ON antonyms(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_study_activities_user_id ON study_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_study_activities_vocabulary_id ON study_activities(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_user_id ON session_summaries(user_id);

-- 12. Update existing records with default values
UPDATE vocabularies 
SET 
  cefr_level = CASE 
    WHEN difficulty = 1 THEN 'A1'
    WHEN difficulty = 2 THEN 'A2'
    WHEN difficulty = 3 THEN 'B1'
    WHEN difficulty = 4 THEN 'B2'
    WHEN difficulty = 5 THEN 'C1'
    ELSE 'A1'
  END,
  example = COALESCE(example, 'This is an example sentence with ' || word || '.')
WHERE cefr_level IS NULL OR example IS NULL;
