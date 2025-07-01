-- Back-fill script to update existing vocabulary records with correct mastery_level based on performance

-- Update mastery_level for existing records where possible
UPDATE vocabularies
SET mastery_level = CASE
  WHEN last_mastered IS NOT NULL THEN 5
  ELSE LEAST(CEIL(0.5 * review_count), 4) -- Estimate mastery level based on review count
END
WHERE mastery_level = 0; -- Target only records with default value
