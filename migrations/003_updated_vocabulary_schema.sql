-- Migration: Updated vocabulary schema with spaced repetition
-- Created: 2025-06-29

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS vocabulary_tags CASCADE;
DROP TABLE IF EXISTS vocabulary_meanings CASCADE;
DROP TABLE IF EXISTS review_logs CASCADE;
DROP TABLE IF EXISTS ai_drafts CASCADE;
DROP TABLE IF EXISTS vocabularies CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create vocabularies table with spaced repetition fields
CREATE TABLE vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  definition TEXT,
  pronunciation TEXT,
  part_of_speech TEXT,
  other_meanings JSONB DEFAULT '[]'::jsonb,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5) DEFAULT 3,
  source_url TEXT,
  notes TEXT,
  
  -- Spaced repetition fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_review_date TIMESTAMP WITH TIME ZONE,
  second_review_date TIMESTAMP WITH TIME ZONE,
  third_review_date TIMESTAMP WITH TIME ZONE,
  fourth_review_date TIMESTAMP WITH TIME ZONE,
  fifth_review_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word)
);

-- Create vocabulary_tags table (many-to-many relationship)
CREATE TABLE vocabulary_tags (
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (vocabulary_id, tag_id)
);

-- Create review_logs table for tracking reviews
CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL, -- 'first', 'second', 'third', 'fourth', 'fifth', 'manual'
  quality INTEGER CHECK (quality >= 1 AND quality <= 5), -- 1=Again, 2=Hard, 3=Good, 4=Easy, 5=Perfect
  time_spent_seconds INTEGER DEFAULT 0,
  correct BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_drafts table for extracted vocabularies
CREATE TABLE ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  definition TEXT,
  suggested_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  other_meanings JSONB DEFAULT '[]'::jsonb,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5) DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  source_passage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags
CREATE POLICY "user_is_owner" ON tags
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create RLS policies for vocabularies
CREATE POLICY "user_is_owner" ON vocabularies
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create RLS policies for vocabulary_tags (inherit from vocabulary and tag)
CREATE POLICY "user_is_owner" ON vocabulary_tags
  FOR ALL USING (
    vocabulary_id IN (
      SELECT id FROM vocabularies WHERE user_id = auth.jwt() ->> 'sub'
    )
    AND tag_id IN (
      SELECT id FROM tags WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Create RLS policies for review_logs
CREATE POLICY "user_is_owner" ON review_logs
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create RLS policies for ai_drafts
CREATE POLICY "user_is_owner" ON ai_drafts
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create indexes for better performance
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_vocabularies_user_id ON vocabularies(user_id);
CREATE INDEX idx_vocabularies_word ON vocabularies(word);
CREATE INDEX idx_vocabularies_next_review ON vocabularies(first_review_date, second_review_date, third_review_date, fourth_review_date, fifth_review_date);
CREATE INDEX idx_vocabulary_tags_vocabulary_id ON vocabulary_tags(vocabulary_id);
CREATE INDEX idx_vocabulary_tags_tag_id ON vocabulary_tags(tag_id);
CREATE INDEX idx_review_logs_user_id ON review_logs(user_id);
CREATE INDEX idx_review_logs_vocabulary_id ON review_logs(vocabulary_id);
CREATE INDEX idx_review_logs_created_at ON review_logs(created_at);
CREATE INDEX idx_ai_drafts_user_id ON ai_drafts(user_id);
CREATE INDEX idx_ai_drafts_status ON ai_drafts(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabularies_updated_at BEFORE UPDATE ON vocabularies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_drafts_updated_at BEFORE UPDATE ON ai_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate next review dates based on spaced repetition
CREATE OR REPLACE FUNCTION calculate_next_review_date(current_review_number INTEGER)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  CASE current_review_number
    WHEN 1 THEN RETURN NOW() + INTERVAL '1 day';   -- First review after 1 day
    WHEN 2 THEN RETURN NOW() + INTERVAL '3 days';  -- Second review after 3 days
    WHEN 3 THEN RETURN NOW() + INTERVAL '7 days';  -- Third review after 1 week
    WHEN 4 THEN RETURN NOW() + INTERVAL '14 days'; -- Fourth review after 2 weeks
    WHEN 5 THEN RETURN NOW() + INTERVAL '30 days'; -- Fifth review after 1 month
    ELSE RETURN NULL;
  END CASE;
END;
$$ language 'plpgsql';
