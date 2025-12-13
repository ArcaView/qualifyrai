-- Migration: Create feedback_submissions table
-- Created: 2025-01-22
-- Purpose: Separate feedback submissions from feature requests

-- Create feedback_submissions table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON public.feedback_submissions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert feedback (anonymous submissions allowed)
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback_submissions;
CREATE POLICY "Anyone can insert feedback"
  ON public.feedback_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Only authenticated users can view feedback (for admin purposes)
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.feedback_submissions;
CREATE POLICY "Authenticated users can view feedback"
  ON public.feedback_submissions
  FOR SELECT
  TO authenticated
  USING (true);

