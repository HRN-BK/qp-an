-- Down Migration: Tear down schema
-- Created: 2025-06-29

-- Disable Row Level Security (RLS) and drop policies
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_is_owner" ON tags;

ALTER TABLE vocabularies DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_is_owner" ON vocabularies;

ALTER TABLE vocabulary_meanings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_is_owner" ON vocabulary_meanings;

ALTER TABLE vocabulary_tags DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_is_owner" ON vocabulary_tags;

ALTER TABLE review_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_is_owner" ON review_logs;

ALTER TABLE ai_drafts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_is_owner" ON ai_drafts;

-- Drop triggers
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
DROP TRIGGER IF EXISTS update_vocabularies_updated_at ON vocabularies;
DROP TRIGGER IF EXISTS update_vocabulary_meanings_updated_at ON vocabulary_meanings;
DROP TRIGGER IF EXISTS update_ai_drafts_updated_at ON ai_drafts;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_tags_user_id;
DROP INDEX IF EXISTS idx_vocabularies_user_id;
DROP INDEX IF EXISTS idx_vocabularies_word;
DROP INDEX IF EXISTS idx_vocabulary_meanings_vocabulary_id;
DROP INDEX IF EXISTS idx_vocabulary_tags_vocabulary_id;
DROP INDEX IF EXISTS idx_vocabulary_tags_tag_id;
DROP INDEX IF EXISTS idx_review_logs_user_id;
DROP INDEX IF EXISTS idx_review_logs_vocabulary_id;
DROP INDEX IF EXISTS idx_review_logs_created_at;
DROP INDEX IF EXISTS idx_ai_drafts_user_id;
DROP INDEX IF EXISTS idx_ai_drafts_status;

-- Drop tables
DROP TABLE IF EXISTS ai_drafts;
DROP TABLE IF EXISTS review_logs;
DROP TABLE IF EXISTS vocabulary_tags;
DROP TABLE IF EXISTS vocabulary_meanings;
DROP TABLE IF EXISTS vocabularies;
DROP TABLE IF EXISTS tags;
