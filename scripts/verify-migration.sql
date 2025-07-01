-- Migration verification script
-- Run this on staging DB to verify the migration was successful

-- Check if mastery_level column exists and has correct default
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'vocabularies' 
  AND column_name = 'mastery_level';

-- Check if last_mastered column exists
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'vocabularies' 
  AND column_name = 'last_mastered';

-- Verify study_activities table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'study_activities';

-- Verify session_summaries table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'session_summaries';

-- Check mastery_level distribution
SELECT 
  mastery_level,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM vocabularies 
GROUP BY mastery_level 
ORDER BY mastery_level;

-- Check for any NULL mastery_level values
SELECT COUNT(*) as null_mastery_levels
FROM vocabularies 
WHERE mastery_level IS NULL;

-- Verify indexes were created
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('vocabularies', 'study_activities', 'session_summaries')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('vocabularies', 'study_activities', 'session_summaries')
ORDER BY tablename, policyname;

-- Verify functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'update_mastery_level',
  'update_session_summary',
  'trigger_update_session_summary'
)
ORDER BY routine_name;
