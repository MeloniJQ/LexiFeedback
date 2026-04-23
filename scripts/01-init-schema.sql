-- Lexical Platform Database Schema

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  proficiency_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
  total_sessions INT DEFAULT 0,
  total_practice_minutes INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create practice_sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL, -- interview, presentation, conversation, reading
  title TEXT,
  description TEXT,
  duration_minutes INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, paused
  transcript TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  INDEX idx_user_id (user_id),
  INDEX idx_mode (mode),
  INDEX idx_status (status)
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL, -- grammar, pronunciation, vocabulary, fluency, overall
  score INT CHECK (score >= 0 AND score <= 100),
  comments TEXT,
  suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id)
);

-- Create progress_tracking table
CREATE TABLE IF NOT EXISTS progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- accuracy, fluency_score, vocabulary_growth
  value DECIMAL(5, 2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  INDEX idx_user_id (user_id),
  INDEX idx_metric_type (metric_type)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "New users can create profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for practice_sessions
CREATE POLICY "Users can view their own sessions" ON practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions" ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for feedback
CREATE POLICY "Users can view feedback for their sessions" ON feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback" ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for progress_tracking
CREATE POLICY "Users can view their own progress" ON progress_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create progress records" ON progress_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);
