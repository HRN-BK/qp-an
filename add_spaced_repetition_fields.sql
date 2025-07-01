-- Add spaced repetition fields to vocabularies table
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3,2) DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS last_rating INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN vocabularies.last_reviewed IS 'Timestamp of when this vocabulary was last reviewed';
COMMENT ON COLUMN vocabularies.next_review IS 'Timestamp of when this vocabulary should be reviewed next';
COMMENT ON COLUMN vocabularies.review_count IS 'Number of times this vocabulary has been reviewed';
COMMENT ON COLUMN vocabularies.ease_factor IS 'Spaced repetition ease factor (SM-2 algorithm)';
COMMENT ON COLUMN vocabularies.last_rating IS 'Last rating given (1=Hard, 2=Good, 3=Easy)';

-- Create index for efficient querying of due vocabularies
CREATE INDEX IF NOT EXISTS idx_vocabularies_next_review 
ON vocabularies(user_id, next_review) 
WHERE next_review IS NOT NULL;

-- Create index for vocabularies that have never been reviewed
CREATE INDEX IF NOT EXISTS idx_vocabularies_never_reviewed 
ON vocabularies(user_id, created_at) 
WHERE next_review IS NULL;
