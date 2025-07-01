-- Migration to add quiz results and session tracking tables
-- This supports the QuizCompletion component functionality

-- Create quiz_sessions table to track overall quiz sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    incorrect_answers INTEGER NOT NULL DEFAULT 0,
    accuracy_percentage DECIMAL(5,2) DEFAULT 0.00,
    session_duration INTEGER DEFAULT 0, -- in seconds
    quiz_type TEXT DEFAULT 'mixed_review',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_results table to track individual question results
CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    vocabulary_id UUID NOT NULL,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    response_time INTEGER DEFAULT 0, -- in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_completed_at ON quiz_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_session_id ON quiz_results(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_vocabulary_id ON quiz_results(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_is_correct ON quiz_results(is_correct);

-- Enable Row Level Security
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz_sessions
CREATE POLICY "Users can view their own quiz sessions" ON quiz_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own quiz sessions" ON quiz_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own quiz sessions" ON quiz_sessions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create RLS policies for quiz_results
CREATE POLICY "Users can view their own quiz results" ON quiz_results
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own quiz results" ON quiz_results
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create function to calculate quiz statistics
CREATE OR REPLACE FUNCTION calculate_quiz_statistics(p_user_id TEXT, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_sessions INTEGER,
    total_questions INTEGER,
    total_correct INTEGER,
    total_incorrect INTEGER,
    average_accuracy DECIMAL,
    best_accuracy DECIMAL,
    total_study_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_sessions,
        COALESCE(SUM(qs.total_questions), 0)::INTEGER as total_questions,
        COALESCE(SUM(qs.correct_answers), 0)::INTEGER as total_correct,
        COALESCE(SUM(qs.incorrect_answers), 0)::INTEGER as total_incorrect,
        COALESCE(AVG(qs.accuracy_percentage), 0)::DECIMAL as average_accuracy,
        COALESCE(MAX(qs.accuracy_percentage), 0)::DECIMAL as best_accuracy,
        COALESCE(SUM(qs.session_duration), 0)::INTEGER as total_study_time
    FROM quiz_sessions qs
    WHERE qs.user_id = p_user_id
    AND qs.completed_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recent quiz performance
CREATE OR REPLACE FUNCTION get_recent_quiz_performance(p_user_id TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    session_id UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER,
    correct_answers INTEGER,
    accuracy_percentage DECIMAL,
    quiz_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id as session_id,
        qs.completed_at,
        qs.total_questions,
        qs.correct_answers,
        qs.accuracy_percentage,
        qs.quiz_type
    FROM quiz_sessions qs
    WHERE qs.user_id = p_user_id
    ORDER BY qs.completed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get vocabulary that needs review (incorrect answers)
CREATE OR REPLACE FUNCTION get_vocabulary_for_review(p_user_id TEXT, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    vocabulary_id UUID,
    word TEXT,
    meaning TEXT,
    incorrect_count INTEGER,
    last_incorrect_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qr.vocabulary_id,
        v.word,
        v.meaning,
        COUNT(qr.id)::INTEGER as incorrect_count,
        MAX(qr.created_at) as last_incorrect_at
    FROM quiz_results qr
    JOIN vocabularies v ON v.id = qr.vocabulary_id
    WHERE qr.user_id = p_user_id
    AND qr.is_correct = FALSE
    AND qr.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY qr.vocabulary_id, v.word, v.meaning
    ORDER BY incorrect_count DESC, last_incorrect_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_sessions_updated_at
    BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust based on your setup)
GRANT SELECT, INSERT, UPDATE ON quiz_sessions TO authenticated;
GRANT SELECT, INSERT ON quiz_results TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_quiz_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_quiz_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_vocabulary_for_review TO authenticated;
