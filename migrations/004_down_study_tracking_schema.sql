-- Down Migration: Revert study tracking schema changes
-- Created: 2024-12-19

-- Drop views (with CASCADE to handle dependencies)
DROP VIEW IF EXISTS recent_study_performance CASCADE;
DROP VIEW IF EXISTS vocabulary_mastery_stats CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_session_on_activity_insert ON study_activities;
DROP TRIGGER IF EXISTS update_session_summaries_updated_at ON session_summaries;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_update_session_summary();
DROP FUNCTION IF EXISTS update_session_summary(UUID);
DROP FUNCTION IF EXISTS update_mastery_level(UUID, DECIMAL);

-- Drop indexes
DROP INDEX IF EXISTS idx_vocabularies_mastery_level;
DROP INDEX IF EXISTS idx_vocabularies_last_mastered;

DROP INDEX IF EXISTS idx_study_activities_user_id;
DROP INDEX IF EXISTS idx_study_activities_vocabulary_id;
DROP INDEX IF EXISTS idx_study_activities_session_id;
DROP INDEX IF EXISTS idx_study_activities_created_at;
DROP INDEX IF EXISTS idx_study_activities_activity_type;

DROP INDEX IF EXISTS idx_session_summaries_user_id;
DROP INDEX IF EXISTS idx_session_summaries_session_id;
DROP INDEX IF EXISTS idx_session_summaries_started_at;
DROP INDEX IF EXISTS idx_session_summaries_session_type;

-- Drop RLS policies
DROP POLICY IF EXISTS "user_is_owner" ON study_activities;
DROP POLICY IF EXISTS "user_is_owner" ON session_summaries;

-- Drop tables (CASCADE to handle foreign key dependencies)
DROP TABLE IF EXISTS study_activities CASCADE;
DROP TABLE IF EXISTS session_summaries CASCADE;

-- Remove columns from vocabularies table
ALTER TABLE vocabularies 
DROP COLUMN IF EXISTS mastery_level,
DROP COLUMN IF EXISTS last_mastered;
