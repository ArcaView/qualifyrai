-- Setup ParseScore schema in Supabase database
-- This separates ParseScore tables from web app tables to avoid conflicts
-- Run this in Supabase SQL Editor before running ParseScore migrations

-- Create parsescore schema
CREATE SCHEMA IF NOT EXISTS parsescore;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA parsescore TO authenticated;
GRANT USAGE ON SCHEMA parsescore TO service_role;

-- Create api_keys table in parsescore schema
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

-- Create parsed_cvs table in parsescore schema
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

-- Create scoring_results table in parsescore schema
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

-- Create job_profiles table in parsescore schema (from later migration)
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

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA parsescore TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA parsescore TO authenticated;

-- Set search_path for service_role to include parsescore schema
ALTER ROLE service_role SET search_path TO public, parsescore;

-- Done!
SELECT 'ParseScore schema created successfully!' as status;
SELECT 'Tables: parsescore.api_keys, parsescore.parsed_cvs, parsescore.scoring_results, parsescore.job_profiles' as info;
