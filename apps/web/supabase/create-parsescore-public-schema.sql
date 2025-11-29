-- Create ParseScore tables in PUBLIC schema to avoid schema visibility issues
-- Using ps_ prefix to avoid conflicts with web app tables

-- Create api_keys table
CREATE TABLE IF NOT EXISTS public.ps_api_keys (
  id VARCHAR(36) PRIMARY KEY,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_ps_api_keys_hash_active
  ON public.ps_api_keys(key_hash, is_active);

-- Create parsed_cvs table
CREATE TABLE IF NOT EXISTS public.ps_parsed_cvs (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  api_key_id VARCHAR(36) NOT NULL,
  filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  parsed_data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (api_key_id) REFERENCES public.ps_api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_ps_parsed_cvs_request_id
  ON public.ps_parsed_cvs(request_id);
CREATE INDEX IF NOT EXISTS idx_ps_parsed_cvs_created_at
  ON public.ps_parsed_cvs(created_at);
CREATE INDEX IF NOT EXISTS idx_ps_parsed_cvs_api_key_created
  ON public.ps_parsed_cvs(api_key_id, created_at);

-- Create scoring_results table
CREATE TABLE IF NOT EXISTS public.ps_scoring_results (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  parsed_cv_id VARCHAR(36) NOT NULL,
  job_description_hash VARCHAR(64) NOT NULL,
  overall_score DECIMAL(5,2) NOT NULL,
  component_scores JSONB NOT NULL,
  rationale TEXT,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (parsed_cv_id) REFERENCES public.ps_parsed_cvs(id)
);

CREATE INDEX IF NOT EXISTS idx_ps_scoring_results_request_id
  ON public.ps_scoring_results(request_id);
CREATE INDEX IF NOT EXISTS idx_ps_scoring_results_score_created
  ON public.ps_scoring_results(overall_score, created_at);
CREATE INDEX IF NOT EXISTS idx_ps_scoring_results_cv_job_hash
  ON public.ps_scoring_results(parsed_cv_id, job_description_hash);

-- Create job_profiles table
CREATE TABLE IF NOT EXISTS public.ps_job_profiles (
  id VARCHAR(36) PRIMARY KEY,
  api_key_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES public.ps_api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_ps_job_profiles_api_key
  ON public.ps_job_profiles(api_key_id);
CREATE INDEX IF NOT EXISTS idx_ps_job_profiles_created
  ON public.ps_job_profiles(created_at);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Verify tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ps_%' ORDER BY tablename;
