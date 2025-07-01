-- Migration: Add study tracking schema with mastery levels and activity logging
-- Created: 2024-12-19

-- Add new columns to vocabularies table
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS mastery_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_mastered TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN vocabularies.mastery_level IS 'Mastery level from 0-5 (0=New, 1=Learning, 2=Young, 3=Mature, 4=Proficient, 5=Mastered)';
COMMENT ON COLUMN vocabularies.last_mastered IS 'Timestamp when vocabulary reached mastery level 5';

-- Create study_activities table to capture every answer
CREATE TABLE study_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'flashcard', 'quiz', 'spelling', 'multiple_choice', 'fill_blank'
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER, -- Response time in milliseconds
  user_answer TEXT,
  correct_answer TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5), -- User's perceived difficulty
  session_id UUID, -- Links to session_summaries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_summaries table
CREATE TABLE session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'study', -- 'study', 'review', 'test', 'practice'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  words_studied INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  average_response_time_ms INTEGER,
  session_duration_seconds INTEGER,
  tags_studied TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of tag names studied in this session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE study_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study_activities
CREATE POLICY "user_is_owner" ON study_activities
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create RLS policies for session_summaries
CREATE POLICY "user_is_owner" ON session_summaries
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Create indexes for better performance
CREATE INDEX idx_vocabularies_mastery_level ON vocabularies(user_id, mastery_level);
CREATE INDEX idx_vocabularies_last_mastered ON vocabularies(last_mastered) WHERE last_mastered IS NOT NULL;

CREATE INDEX idx_study_activities_user_id ON study_activities(user_id);
CREATE INDEX idx_study_activities_vocabulary_id ON study_activities(vocabulary_id);
CREATE INDEX idx_study_activities_session_id ON study_activities(session_id);
CREATE INDEX idx_study_activities_created_at ON study_activities(created_at);
CREATE INDEX idx_study_activities_activity_type ON study_activities(activity_type);

CREATE INDEX idx_session_summaries_user_id ON session_summaries(user_id);
CREATE INDEX idx_session_summaries_session_id ON session_summaries(session_id);
CREATE INDEX idx_session_summaries_started_at ON session_summaries(started_at);
CREATE INDEX idx_session_summaries_session_type ON session_summaries(session_type);

-- Add updated_at trigger for session_summaries
CREATE TRIGGER update_session_summaries_updated_at BEFORE UPDATE ON session_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update mastery level based on performance
CREATE OR REPLACE FUNCTION update_mastery_level(vocab_id UUID, performance_score DECIMAL)
RETURNS VOID AS $$
DECLARE
  current_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current mastery level
  SELECT mastery_level INTO current_level 
  FROM vocabularies 
  WHERE id = vocab_id;
  
  -- Calculate new mastery level based on performance
  -- Performance score should be between 0.0 and 1.0
  IF performance_score >= 0.9 THEN
    new_level := LEAST(current_level + 1, 5);
  ELSIF performance_score >= 0.7 THEN
    new_level := current_level; -- Maintain current level
  ELSE
    new_level := GREATEST(current_level - 1, 0); -- Decrease level but not below 0
  END IF;
  
  -- Update mastery level and last_mastered timestamp if reaching level 5
  UPDATE vocabularies 
  SET 
    mastery_level = new_level,
    last_mastered = CASE 
      WHEN new_level = 5 AND current_level < 5 THEN NOW() 
      ELSE last_mastered 
    END,
    updated_at = NOW()
  WHERE id = vocab_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate session statistics
CREATE OR REPLACE FUNCTION update_session_summary(session_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE session_summaries 
  SET 
    words_studied = (
      SELECT COUNT(DISTINCT vocabulary_id)
      FROM study_activities 
      WHERE session_id = session_uuid
    ),
    correct_answers = (
      SELECT COUNT(*)
      FROM study_activities 
      WHERE session_id = session_uuid AND is_correct = true
    ),
    total_answers = (
      SELECT COUNT(*)
      FROM study_activities 
      WHERE session_id = session_uuid
    ),
    average_response_time_ms = (
      SELECT AVG(response_time_ms)::INTEGER
      FROM study_activities 
      WHERE session_id = session_uuid AND response_time_ms IS NOT NULL
    ),
    session_duration_seconds = (
      SELECT EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::INTEGER
      FROM study_activities 
      WHERE session_id = session_uuid
    ),
    updated_at = NOW()
  WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update session summary when study activities are added
CREATE OR REPLACE FUNCTION trigger_update_session_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session summary if session_id exists
  IF NEW.session_id IS NOT NULL THEN
    PERFORM update_session_summary(NEW.session_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_on_activity_insert
  AFTER INSERT ON study_activities
  FOR EACH ROW EXECUTE FUNCTION trigger_update_session_summary();

-- Create view for vocabulary mastery statistics
CREATE OR REPLACE VIEW vocabulary_mastery_stats AS
SELECT 
  user_id,
  COUNT(*) as total_vocabularies,
  COUNT(*) FILTER (WHERE mastery_level = 0) as new_words,
  COUNT(*) FILTER (WHERE mastery_level = 1) as learning_words,
  COUNT(*) FILTER (WHERE mastery_level = 2) as young_words,
  COUNT(*) FILTER (WHERE mastery_level = 3) as mature_words,
  COUNT(*) FILTER (WHERE mastery_level = 4) as proficient_words,
  COUNT(*) FILTER (WHERE mastery_level = 5) as mastered_words,
  ROUND(
    (COUNT(*) FILTER (WHERE mastery_level >= 3)::DECIMAL / COUNT(*)) * 100, 2
  ) as mastery_percentage
FROM vocabularies
GROUP BY user_id;

-- Create RLS policy for the view
CREATE POLICY "user_is_owner" ON vocabulary_mastery_stats
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

-- Create view for recent study performance
CREATE OR REPLACE VIEW recent_study_performance AS
SELECT 
  sa.user_id,
  sa.vocabulary_id,
  v.word,
  COUNT(*) as attempts,
  COUNT(*) FILTER (WHERE sa.is_correct) as correct_attempts,
  ROUND(
    (COUNT(*) FILTER (WHERE sa.is_correct)::DECIMAL / COUNT(*)) * 100, 2
  ) as accuracy_percentage,
  AVG(sa.response_time_ms) as avg_response_time_ms,
  MAX(sa.created_at) as last_attempt
FROM study_activities sa
JOIN vocabularies v ON sa.vocabulary_id = v.id
WHERE sa.created_at >= NOW() - INTERVAL '30 days'
GROUP BY sa.user_id, sa.vocabulary_id, v.word;

-- Create RLS policy for the view
CREATE POLICY "user_is_owner" ON recent_study_performance
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');
