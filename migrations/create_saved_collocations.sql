-- Create table for saving user collocations and phrasal verbs
CREATE TABLE IF NOT EXISTS saved_collocations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    collocation_text TEXT NOT NULL,
    base_word TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'collocation' CHECK (type IN ('collocation', 'phrasal_verb')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate entries for the same user
    UNIQUE(user_id, collocation_text, base_word, type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_collocations_user_id ON saved_collocations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_collocations_base_word ON saved_collocations(base_word);
CREATE INDEX IF NOT EXISTS idx_saved_collocations_type ON saved_collocations(type);

-- Enable RLS (Row Level Security)
ALTER TABLE saved_collocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to ensure users can only access their own data
CREATE POLICY "Users can view their own saved collocations" ON saved_collocations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved collocations" ON saved_collocations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved collocations" ON saved_collocations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved collocations" ON saved_collocations
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_collocations_updated_at 
    BEFORE UPDATE ON saved_collocations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
