-- Add new columns for vocabulary extensions
ALTER TABLE vocabularies 
ADD COLUMN IF NOT EXISTS synonyms TEXT[],
ADD COLUMN IF NOT EXISTS antonyms TEXT[],
ADD COLUMN IF NOT EXISTS collocations TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN vocabularies.synonyms IS 'Array of synonyms for the vocabulary word';
COMMENT ON COLUMN vocabularies.antonyms IS 'Array of antonyms for the vocabulary word';
COMMENT ON COLUMN vocabularies.collocations IS 'Array of common collocations with the vocabulary word';
