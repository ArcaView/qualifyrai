-- Migration: Create feedback email notification trigger for feedback_submissions
-- Created: 2025-01-22
-- Purpose: Automatically send email notifications when feedback is submitted

-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to send feedback email via Edge Function
-- This function calls the Supabase Edge Function asynchronously
CREATE OR REPLACE FUNCTION public.send_feedback_submission_email()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  edge_function_url TEXT;
  payload JSONB;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Set your Supabase project URL
  supabase_url := 'https://nxteuyzcxabqpelingje.supabase.co';
  
  -- Set your service role key here
  -- Get it from: Supabase Dashboard → Settings → API → service_role key
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dGV1eXpjeGFicXBlbGluZ2plIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQyMjU4OSwiZXhwIjoyMDc3OTk4NTg5fQ.KVbjtZsRZz4MJ9Xt_hl6AKmeDjg3j9g_bDD1zZmyLjA';
  
  -- Construct Edge Function URL
  edge_function_url := supabase_url || '/functions/v1/send-feedback-email';
  
  -- Build payload for feedback submission
  -- Note: user_id column doesn't exist in feedback_submissions table
  payload := jsonb_build_object(
    'id', NEW.id::text,
    'title', 'Feedback: ' || LEFT(NEW.message, 50),
    'description', NEW.message || CASE WHEN NEW.email IS NOT NULL THEN E'\n\nContact: ' || NEW.email ELSE '' END,
    'user_id', NULL,  -- user_id not available in this table
    'created_at', NEW.created_at::text
  );
  
  -- Call Edge Function asynchronously using pg_net
  -- This is non-blocking and won't slow down the INSERT
  RAISE NOTICE 'Trigger fired for feedback_submission %', NEW.id;
  RAISE NOTICE 'Edge function URL: %', edge_function_url;
  
  IF service_role_key IS NOT NULL AND service_role_key != '' THEN
    RAISE NOTICE 'Service role key found, attempting to call Edge Function...';
    
    BEGIN
      -- http_post signature: url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer
      -- IMPORTANT: body must be jsonb, not text!
      SELECT net.http_post(
        url := edge_function_url,
        body := payload,  -- Keep as jsonb!
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        )
      ) INTO request_id;
      
      RAISE NOTICE '✅ Feedback email queued for feedback_submission % (request_id: %)', NEW.id, request_id;
      RAISE LOG 'Feedback email queued for feedback_submission % (request_id: %)', NEW.id, request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Failed to call pg_net.http_post: %', SQLERRM;
        RAISE WARNING 'Error details: %', SQLSTATE;
    END;
  ELSE
    RAISE WARNING '❌ Service role key not configured. Email notification skipped for feedback_submission %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the INSERT if email fails - email is non-critical
    RAISE WARNING 'Failed to queue feedback email for feedback_submission %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on INSERT
DROP TRIGGER IF EXISTS trigger_send_feedback_submission_email ON public.feedback_submissions;
CREATE TRIGGER trigger_send_feedback_submission_email
  AFTER INSERT ON public.feedback_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.send_feedback_submission_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

