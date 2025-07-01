-- Back-fill script for mastery_level field
-- This script intelligently assigns mastery levels based on existing review data

BEGIN;

-- Update mastery_level based on review performance and patterns
UPDATE user_vocabularies 
SET mastery_level = CASE
    -- New vocabulary (never reviewed or very few reviews)
    WHEN review_count = 0 OR review_count IS NULL THEN 0
    
    -- Learning (1-3 reviews, mixed results)
    WHEN review_count <= 3 AND consecutive_correct < 2 THEN 1
    
    -- Young (4-7 reviews, some success)
    WHEN review_count <= 7 AND consecutive_correct >= 2 AND consecutive_correct < 4 THEN 2
    
    -- Mature (8+ reviews, good success rate)
    WHEN review_count >= 8 AND consecutive_correct >= 4 AND consecutive_correct < 8 THEN 3
    
    -- Proficient (15+ reviews, high success rate)
    WHEN review_count >= 15 AND consecutive_correct >= 8 AND consecutive_correct < 12 THEN 4
    
    -- Mastered (20+ reviews, very high success rate)
    WHEN review_count >= 20 AND consecutive_correct >= 12 THEN 5
    
    -- Default case (fallback based on review count)
    WHEN review_count <= 2 THEN 0
    WHEN review_count <= 5 THEN 1
    WHEN review_count <= 10 THEN 2
    WHEN review_count <= 20 THEN 3
    ELSE 4
END
WHERE mastery_level IS NULL;

-- Update last_mastered for words that reached mastery level 5
UPDATE user_vocabularies 
SET last_mastered = COALESCE(last_reviewed, updated_at)
WHERE mastery_level = 5 AND last_mastered IS NULL;

-- Set default ease_factor for records that don't have it
UPDATE user_vocabularies 
SET ease_factor = 2.5
WHERE ease_factor IS NULL;

-- Update next_review dates based on new mastery levels
UPDATE user_vocabularies 
SET next_review = CASE 
    WHEN mastery_level = 0 THEN CURRENT_DATE + INTERVAL '1 day'
    WHEN mastery_level = 1 THEN CURRENT_DATE + INTERVAL '3 days'
    WHEN mastery_level = 2 THEN CURRENT_DATE + INTERVAL '7 days'
    WHEN mastery_level = 3 THEN CURRENT_DATE + INTERVAL '21 days'
    WHEN mastery_level = 4 THEN CURRENT_DATE + INTERVAL '60 days'
    WHEN mastery_level = 5 THEN CURRENT_DATE + INTERVAL '180 days'
    ELSE CURRENT_DATE + INTERVAL '1 day'
END
WHERE next_review IS NULL;

-- Verify the back-fill results
SELECT 
    mastery_level,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM user_vocabularies 
GROUP BY mastery_level
ORDER BY mastery_level;

-- Show sample of updated records
SELECT 
    vocabulary_id,
    mastery_level,
    review_count,
    consecutive_correct,
    last_reviewed,
    next_review,
    ease_factor
FROM user_vocabularies 
ORDER BY mastery_level, review_count DESC
LIMIT 20;

COMMIT;

-- If you want to rollback, uncomment the line below instead of COMMIT
-- ROLLBACK;
