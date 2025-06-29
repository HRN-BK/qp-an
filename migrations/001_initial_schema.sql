-- Migration: Initial schema with RLS
-- Created: 2025-06-29

-- Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create vocabularies table
CREATE TABLE vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  pronunciation TEXT,
  part_of_speech TEXT,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word)
);

-- Create vocabulary_meanings table
CREATE TABLE vocabulary_meanings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  translation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vocabulary_tags table (many-to-many relationship)
CREATE TABLE vocabulary_tags (
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (vocabulary_id, tag_id)
);

-- Create review_logs table
CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL, -- 'flashcard', 'quiz', 'practice'
  score INTEGER CHECK (score >= 0 AND score <= 100),
  time_spent_seconds INTEGER,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_drafts table
CREATE TABLE ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  draft_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  ai_model TEXT,
  ai_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_meanings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags
CREATE POLICY "user_is_owner" ON tags
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create RLS policies for vocabularies
CREATE POLICY "user_is_owner" ON vocabularies
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create RLS policies for vocabulary_meanings (inherit from vocabulary)
CREATE POLICY "user_is_owner" ON vocabulary_meanings
  FOR ALL USING (
    vocabulary_id IN (
      SELECT id FROM vocabularies WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

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
CREATE INDEX idx_vocabulary_meanings_vocabulary_id ON vocabulary_meanings(vocabulary_id);
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

CREATE TRIGGER update_vocabulary_meanings_updated_at BEFORE UPDATE ON vocabulary_meanings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_drafts_updated_at BEFORE UPDATE ON ai_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
