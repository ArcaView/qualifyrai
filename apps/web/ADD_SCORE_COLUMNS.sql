-- Add missing columns to candidates table for AI scoring feature
-- Run this in your Supabase SQL Editor

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 0 AND score <= 100),
ADD COLUMN IF NOT EXISTS fit TEXT CHECK (fit IN ('excellent', 'good', 'fair')),
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb;

-- Create index on new columns
CREATE INDEX IF NOT EXISTS idx_candidates_fit ON public.candidates(fit);
CREATE INDEX IF NOT EXISTS idx_candidates_score_v2 ON public.candidates(score DESC);

-- You can now use the AI Score feature!
