# Flash Cards Setup Instructions

## Database Schema Update Required

To enable the Flash Cards feature with spaced repetition, you need to add additional columns to your `vocabularies` table in Supabase.

### Steps to Update Database:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project: `xjqaiiarndxqxyideelu`

2. **Open SQL Editor**
   - Go to the "SQL Editor" section in the sidebar
   - Click "New query"

3. **Run the Migration SQL**
   - Copy and paste the following SQL script:

```sql
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
```

4. **Click "Run"** to execute the migration

5. **Verify the Changes**
   - Go to "Table Editor" → "vocabularies"
   - Check that the new columns appear:
     - `last_reviewed` (timestamptz)
     - `next_review` (timestamptz) 
     - `review_count` (int4, default: 0)
     - `ease_factor` (numeric, default: 2.50)
     - `last_rating` (int4)

## Features After Setup:

✅ **Flash Cards Page** (`/flashcards`)
- Spaced repetition algorithm (SM-2)
- Rate difficulty: Hard (1 day), Good (3 days), Easy (1 week)
- Progress tracking and session statistics
- Smart scheduling based on your performance

✅ **Enhanced Extract Page**
- Fixed mock data for vocabulary extraction
- Multiple word selection from text
- Batch saving of extracted vocabulary

✅ **Navigation Updated**
- Flash Cards link added to main navigation
- Accessible from all pages

## How the Spaced Repetition Works:

1. **New vocabularies** appear immediately for first review
2. **Rating system**:
   - Hard (1): Review again tomorrow
   - Good (2): Review in 3 days
   - Easy (3): Review in 1 week
3. **Adaptive scheduling**: The algorithm adjusts intervals based on your performance
4. **Ease factor**: Words you find difficult appear more frequently

## Current Status:

- ✅ Flash Cards page implemented
- ✅ Spaced repetition algorithm ready
- ✅ Progress tracking functional
- ⏳ **Database migration needed** (run SQL above)
- ✅ Fallback mode working until migration complete

Once you run the SQL migration, the Flash Cards feature will be fully operational!
