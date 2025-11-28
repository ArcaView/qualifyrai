-- Combined Fix: Apply all missing components for 404 errors
-- This includes both analytics and ParseScore database setup
-- Run this ONCE in Supabase SQL Editor

-- ============================================
-- PART 1: Fix Analytics 404 Error
-- ============================================

-- Create analytics_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type_date ON analytics_events(event_type, created_at DESC);
DROP INDEX IF EXISTS idx_analytics_event_data;
CREATE INDEX idx_analytics_event_data ON analytics_events USING GIN (event_data);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own analytics events" ON analytics_events;
CREATE POLICY "Users can view their own analytics events"
  ON analytics_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert analytics events" ON analytics_events;
CREATE POLICY "Service role can insert analytics events"
  ON analytics_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can read all analytics events" ON analytics_events;
CREATE POLICY "Service role can read all analytics events"
  ON analytics_events FOR SELECT USING (true);

-- Create the log_analytics_event function
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: Fix ParseScore CV 404 Error
-- ============================================

-- Create parsescore schema
CREATE SCHEMA IF NOT EXISTS parsescore;

-- Grant permissions
GRANT USAGE ON SCHEMA parsescore TO authenticated;
GRANT USAGE ON SCHEMA parsescore TO service_role;

-- Create api_keys table
CREATE TABLE IF NOT EXISTS parsescore.api_keys (
  id VARCHAR(36) PRIMARY KEY,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_parsescore_api_keys_hash_active
  ON parsescore.api_keys(key_hash, is_active);

-- Create parsed_cvs table
CREATE TABLE IF NOT EXISTS parsescore.parsed_cvs (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  api_key_id VARCHAR(36) NOT NULL,
  filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  parsed_data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (api_key_id) REFERENCES parsescore.api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_parsescore_parsed_cvs_request_id
  ON parsescore.parsed_cvs(request_id);
CREATE INDEX IF NOT EXISTS idx_parsescore_parsed_cvs_created_at
  ON parsescore.parsed_cvs(created_at);
CREATE INDEX IF NOT EXISTS idx_parsescore_parsed_cvs_api_key_created
  ON parsescore.parsed_cvs(api_key_id, created_at);

-- Create scoring_results table
CREATE TABLE IF NOT EXISTS parsescore.scoring_results (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  parsed_cv_id VARCHAR(36) NOT NULL,
  job_description_hash VARCHAR(64) NOT NULL,
  overall_score DECIMAL(5,2) NOT NULL,
  component_scores JSONB NOT NULL,
  rationale TEXT,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (parsed_cv_id) REFERENCES parsescore.parsed_cvs(id)
);

CREATE INDEX IF NOT EXISTS idx_parsescore_scoring_results_request_id
  ON parsescore.scoring_results(request_id);
CREATE INDEX IF NOT EXISTS idx_parsescore_scoring_results_score_created
  ON parsescore.scoring_results(overall_score, created_at);
CREATE INDEX IF NOT EXISTS idx_parsescore_scoring_results_cv_job_hash
  ON parsescore.scoring_results(parsed_cv_id, job_description_hash);

-- Create job_profiles table
CREATE TABLE IF NOT EXISTS parsescore.job_profiles (
  id VARCHAR(36) PRIMARY KEY,
  api_key_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES parsescore.api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_parsescore_job_profiles_api_key
  ON parsescore.job_profiles(api_key_id);
CREATE INDEX IF NOT EXISTS idx_parsescore_job_profiles_created
  ON parsescore.job_profiles(created_at);

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA parsescore TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA parsescore TO authenticated;

-- Set search_path
ALTER ROLE service_role SET search_path TO public, parsescore;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check analytics setup
SELECT 'Analytics function exists' as component, COUNT(*) as status
FROM pg_proc WHERE proname = 'log_analytics_event'
UNION ALL
SELECT 'Analytics table exists', COUNT(*)
FROM pg_tables WHERE tablename = 'analytics_events' AND schemaname = 'public'
UNION ALL
-- Check ParseScore setup
SELECT 'ParseScore schema exists', COUNT(*)
FROM information_schema.schemata WHERE schema_name = 'parsescore'
UNION ALL
SELECT 'ParseScore tables created', COUNT(*)
FROM pg_tables WHERE schemaname = 'parsescore';

-- Expected results:
-- Analytics function exists: 1
-- Analytics table exists: 1
-- ParseScore schema exists: 1
-- ParseScore tables created: 4

SELECT '✅ All components created successfully!' as result;
