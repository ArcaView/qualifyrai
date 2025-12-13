-- Migration: Change overall_score from INTEGER to NUMERIC for decimal precision
-- Created: 2025-01-22
-- Purpose: Support accurate decimal scores (e.g., 65.6) instead of rounding to integers

-- Drop the user_statistics view first (it depends on overall_score)
DROP VIEW IF EXISTS public.user_statistics;

-- Change overall_score to NUMERIC(5,2) to support decimal scores like 98.5
-- NUMERIC(5,2) means: 5 total digits, 2 after decimal point (e.g., 100.00, 65.60)
ALTER TABLE public.candidates 
  ALTER COLUMN overall_score TYPE NUMERIC(5,2) 
  USING overall_score::NUMERIC(5,2);

-- Update the CHECK constraint to work with NUMERIC
ALTER TABLE public.candidates 
  DROP CONSTRAINT IF EXISTS candidates_overall_score_check;
  
ALTER TABLE public.candidates 
  ADD CONSTRAINT candidates_overall_score_check 
  CHECK (overall_score >= 0 AND overall_score <= 100);

-- Also update other score columns for consistency (optional, but recommended)
ALTER TABLE public.candidates 
  ALTER COLUMN skills_match_score TYPE NUMERIC(5,2) 
  USING skills_match_score::NUMERIC(5,2);

ALTER TABLE public.candidates 
  DROP CONSTRAINT IF EXISTS candidates_skills_match_score_check;
  
ALTER TABLE public.candidates 
  ADD CONSTRAINT candidates_skills_match_score_check 
  CHECK (skills_match_score >= 0 AND skills_match_score <= 100);

ALTER TABLE public.candidates 
  ALTER COLUMN experience_score TYPE NUMERIC(5,2) 
  USING experience_score::NUMERIC(5,2);

ALTER TABLE public.candidates 
  DROP CONSTRAINT IF EXISTS candidates_experience_score_check;
  
ALTER TABLE public.candidates 
  ADD CONSTRAINT candidates_experience_score_check 
  CHECK (experience_score >= 0 AND experience_score <= 100);

ALTER TABLE public.candidates 
  ALTER COLUMN education_score TYPE NUMERIC(5,2) 
  USING education_score::NUMERIC(5,2);

ALTER TABLE public.candidates 
  DROP CONSTRAINT IF EXISTS candidates_education_score_check;
  
ALTER TABLE public.candidates 
  ADD CONSTRAINT candidates_education_score_check 
  CHECK (education_score >= 0 AND education_score <= 100);

-- Recreate the user_statistics view (it depends on overall_score)
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT c.id) as total_candidates,
  COUNT(DISTINCT r.id) as total_roles,
  COUNT(DISTINCT CASE WHEN c.status = 'shortlisted' THEN c.id END) as shortlisted_candidates,
  COUNT(DISTINCT CASE WHEN c.status = 'hired' THEN c.id END) as hired_candidates,
  AVG(c.overall_score) as avg_candidate_score,
  COUNT(DISTINCT aul.id) as total_api_calls,
  COUNT(DISTINCT CASE WHEN aul.status_code = 200 THEN aul.id END) as successful_api_calls,
  MAX(c.created_at) as last_candidate_added
FROM auth.users u
LEFT JOIN public.candidates c ON c.user_id = u.id
LEFT JOIN public.roles r ON r.user_id = u.id
LEFT JOIN public.api_usage_logs aul ON aul.user_id = u.id
GROUP BY u.id;

