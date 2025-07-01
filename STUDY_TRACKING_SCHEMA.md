# Study Tracking Schema Documentation

This document describes the enhanced database schema for comprehensive study tracking and mastery level management in the AI Vocabulary application.

## Overview

Migration `004_add_study_tracking_schema.sql` introduces:
- Mastery level tracking for vocabularies
- Detailed study activity logging
- Session-based study summaries
- Performance analytics views

## New Columns in `vocabularies` Table

### `mastery_level` (INTEGER, default 0)
Tracks the learning progress of each vocabulary word:
- **0**: New (never studied)
- **1**: Learning (recently introduced)
- **2**: Young (familiar but needs reinforcement)
- **3**: Mature (well-known)
- **4**: Proficient (consistently correct)
- **5**: Mastered (fully learned)

### `last_mastered` (TIMESTAMP WITH TIME ZONE)
Records when a vocabulary word reached mastery level 5. NULL if not yet mastered.

## New Tables

### `study_activities` Table
Captures every individual study interaction:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `vocabulary_id` | UUID | Reference to vocabularies table |
| `user_id` | TEXT | User identifier |
| `activity_type` | TEXT | Type of study activity |
| `is_correct` | BOOLEAN | Whether the answer was correct |
| `response_time_ms` | INTEGER | Response time in milliseconds |
| `user_answer` | TEXT | User's actual answer |
| `correct_answer` | TEXT | The correct answer |
| `difficulty_rating` | INTEGER | User's perceived difficulty (1-5) |
| `session_id` | UUID | Links to session_summaries |
| `created_at` | TIMESTAMP | When the activity occurred |

**Activity Types:**
- `flashcard`: Traditional flashcard review
- `quiz`: Quiz-style questions
- `spelling`: Spelling exercises
- `multiple_choice`: Multiple choice questions
- `fill_blank`: Fill-in-the-blank exercises

### `session_summaries` Table
Aggregates study session data:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | UUID | Unique session identifier |
| `user_id` | TEXT | User identifier |
| `session_type` | TEXT | Type of study session |
| `started_at` | TIMESTAMP | Session start time |
| `finished_at` | TIMESTAMP | Session end time |
| `words_studied` | INTEGER | Number of unique words studied |
| `correct_answers` | INTEGER | Number of correct answers |
| `total_answers` | INTEGER | Total number of answers |
| `average_response_time_ms` | INTEGER | Average response time |
| `session_duration_seconds` | INTEGER | Total session duration |
| `tags_studied` | TEXT[] | Array of tag names studied |

**Session Types:**
- `study`: General study session
- `review`: Spaced repetition review
- `test`: Assessment session
- `practice`: Practice mode

## Helper Functions

### `update_mastery_level(vocab_id UUID, performance_score DECIMAL)`
Automatically adjusts mastery level based on performance:
- Performance score 0.9+: Increase mastery level
- Performance score 0.7-0.89: Maintain current level
- Performance score <0.7: Decrease mastery level

### `update_session_summary(session_uuid UUID)`
Recalculates session statistics from study activities.

## Views

### `vocabulary_mastery_stats`
Provides mastery statistics per user:
```sql
SELECT * FROM vocabulary_mastery_stats WHERE user_id = 'user123';
```

Returns:
- `total_vocabularies`: Total word count
- `new_words`: Words at mastery level 0
- `learning_words`: Words at mastery level 1
- `young_words`: Words at mastery level 2
- `mature_words`: Words at mastery level 3
- `proficient_words`: Words at mastery level 4
- `mastered_words`: Words at mastery level 5
- `mastery_percentage`: Percentage of words at level 3+

### `recent_study_performance`
Shows performance for words studied in the last 30 days:
```sql
SELECT * FROM recent_study_performance 
WHERE user_id = 'user123' 
ORDER BY accuracy_percentage DESC;
```

Returns per vocabulary:
- `attempts`: Total number of attempts
- `correct_attempts`: Number of correct attempts
- `accuracy_percentage`: Success rate
- `avg_response_time_ms`: Average response time
- `last_attempt`: Most recent study time

## Usage Examples

### Recording a Study Activity
```sql
INSERT INTO study_activities (
  vocabulary_id, 
  user_id, 
  activity_type, 
  is_correct, 
  response_time_ms, 
  user_answer, 
  correct_answer,
  session_id
) VALUES (
  'vocab-uuid-123',
  'user123',
  'flashcard',
  true,
  2500,
  'serendipity',
  'serendipity',
  'session-uuid-456'
);
```

### Starting a Study Session
```sql
INSERT INTO session_summaries (
  session_id,
  user_id,
  session_type,
  started_at
) VALUES (
  gen_random_uuid(),
  'user123',
  'study',
  NOW()
);
```

### Updating Mastery Level
```sql
-- After calculating performance score (e.g., 0.85 = 85% accuracy)
SELECT update_mastery_level('vocab-uuid-123', 0.85);
```

### Querying Due Vocabularies by Mastery Level
```sql
-- Get words that need review, prioritizing lower mastery levels
SELECT v.*, sa.last_attempt
FROM vocabularies v
LEFT JOIN (
  SELECT vocabulary_id, MAX(created_at) as last_attempt
  FROM study_activities
  GROUP BY vocabulary_id
) sa ON v.id = sa.vocabulary_id
WHERE v.user_id = 'user123'
  AND (sa.last_attempt IS NULL OR sa.last_attempt < NOW() - INTERVAL '1 day')
ORDER BY v.mastery_level ASC, sa.last_attempt ASC NULLS FIRST
LIMIT 20;
```

## Row Level Security (RLS)

All new tables have RLS enabled with policies ensuring users can only access their own data:
- `study_activities`: Filter by `user_id`
- `session_summaries`: Filter by `user_id`
- Views inherit RLS from underlying tables

## Performance Considerations

### Indexes Created
- `idx_vocabularies_mastery_level`: Query by user and mastery level
- `idx_vocabularies_last_mastered`: Find recently mastered words
- `idx_study_activities_*`: Various activity queries
- `idx_session_summaries_*`: Session-based queries

### Automatic Updates
- Session summaries are automatically updated when study activities are inserted
- Mastery levels should be updated periodically based on performance data
- Use the provided functions to maintain data consistency

## Migration Commands

### Apply Migration
```sql
\i migrations/004_add_study_tracking_schema.sql
```

### Rollback Migration
```sql
\i migrations/004_down_study_tracking_schema.sql
```

## Integration Notes

1. **Session Management**: Always create a session summary before recording study activities
2. **Performance Calculation**: Calculate performance scores based on recent activity accuracy
3. **Mastery Updates**: Run mastery level updates after each study session
4. **Analytics**: Use the provided views for dashboard and progress tracking features
