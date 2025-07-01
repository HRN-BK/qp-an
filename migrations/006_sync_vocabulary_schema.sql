-- Migration: Sync vocabulary schema with application code
-- Add missing fields that application expects

-- Add missing columns to vocabularies table
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS cefr_level TEXT DEFAULT 'A1',
ADD COLUMN IF NOT EXISTS pronunciation_ipa TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS example TEXT;

-- Add spaced repetition fields if they don't exist (from add_spaced_repetition_fields.sql)
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3,2) DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS last_rating INTEGER;

-- Add vocabulary extensions if they don't exist
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS synonyms TEXT[],
ADD COLUMN IF NOT EXISTS antonyms TEXT[],
ADD COLUMN IF NOT EXISTS collocations TEXT[];

-- Create synonyms and antonyms tables if they don't exist (as separate normalized tables)
CREATE TABLE IF NOT EXISTS synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  synonym_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS antonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  antonym_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE antonyms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for synonyms and antonyms
CREATE POLICY IF NOT EXISTS "user_is_owner_synonyms" ON synonyms
  FOR ALL USING (
    vocabulary_id IN (
      SELECT id FROM vocabularies WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY IF NOT EXISTS "user_is_owner_antonyms" ON antonyms
  FOR ALL USING (
    vocabulary_id IN (
      SELECT id FROM vocabularies WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocabularies_cefr_level ON vocabularies(cefr_level);
CREATE INDEX IF NOT EXISTS idx_vocabularies_next_review ON vocabularies(user_id, next_review) 
  WHERE next_review IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vocabularies_never_reviewed ON vocabularies(user_id, created_at) 
  WHERE next_review IS NULL;
CREATE INDEX IF NOT EXISTS idx_synonyms_vocabulary_id ON synonyms(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_antonyms_vocabulary_id ON antonyms(vocabulary_id);

-- Add comments for documentation
COMMENT ON COLUMN vocabularies.cefr_level IS 'CEFR level (A1, A2, B1, B2, C1, C2)';
COMMENT ON COLUMN vocabularies.pronunciation_ipa IS 'IPA pronunciation notation';
COMMENT ON COLUMN vocabularies.audio_url IS 'URL to audio pronunciation file';
COMMENT ON COLUMN vocabularies.example IS 'Example sentence using the vocabulary word';
COMMENT ON COLUMN vocabularies.last_reviewed IS 'Timestamp of when this vocabulary was last reviewed';
COMMENT ON COLUMN vocabularies.next_review IS 'Timestamp of when this vocabulary should be reviewed next';
COMMENT ON COLUMN vocabularies.review_count IS 'Number of times this vocabulary has been reviewed';
COMMENT ON COLUMN vocabularies.ease_factor IS 'Spaced repetition ease factor (SM-2 algorithm)';
COMMENT ON COLUMN vocabularies.last_rating IS 'Last rating given (1=Hard, 2=Good, 3=Easy)';

-- Update existing records with default values where null
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
