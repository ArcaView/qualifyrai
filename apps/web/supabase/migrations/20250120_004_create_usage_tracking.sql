-- Migration: Create usage_tracking table for quota enforcement
-- Created: 2025-01-20
-- Purpose: Track monthly usage of parses and scores per user

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  parses_used INTEGER DEFAULT 0 CHECK (parses_used >= 0),
  scores_used INTEGER DEFAULT 0 CHECK (scores_used >= 0),
  api_calls_made INTEGER DEFAULT 0 CHECK (api_calls_made >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start DESC);

-- Enable Row Level Security
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own usage
DROP POLICY IF EXISTS "Users can view their own usage" ON usage_tracking;
CREATE POLICY "Users can view their own usage"
  ON usage_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert/update usage (increment counters)
DROP POLICY IF EXISTS "Service role can manage usage tracking" ON usage_tracking;
CREATE POLICY "Service role can manage usage tracking"
  ON usage_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment parse usage
CREATE OR REPLACE FUNCTION increment_parse_usage(
  p_user_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calculate current billing period (1st of month to last day of month)
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

  -- Insert or update usage record
  INSERT INTO usage_tracking (user_id, period_start, period_end, parses_used)
  VALUES (p_user_id, v_period_start, v_period_end, p_count)
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    parses_used = usage_tracking.parses_used + p_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment score usage
CREATE OR REPLACE FUNCTION increment_score_usage(
  p_user_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

  INSERT INTO usage_tracking (user_id, period_start, period_end, scores_used)
  VALUES (p_user_id, v_period_start, v_period_end, p_count)
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    scores_used = usage_tracking.scores_used + p_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment API call usage
CREATE OR REPLACE FUNCTION increment_api_call_usage(
  p_user_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

  INSERT INTO usage_tracking (user_id, period_start, period_end, api_calls_made)
  VALUES (p_user_id, v_period_start, v_period_end, p_count)
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    api_calls_made = usage_tracking.api_calls_made + p_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current usage for a user
CREATE OR REPLACE FUNCTION get_current_usage(p_user_id UUID)
RETURNS TABLE (
  parses_used INTEGER,
  scores_used INTEGER,
  api_calls_made INTEGER,
  period_start DATE,
  period_end DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ut.parses_used,
    ut.scores_used,
    ut.api_calls_made,
    ut.period_start,
    ut.period_end
  FROM usage_tracking ut
  WHERE ut.user_id = p_user_id
    AND ut.period_start = DATE_TRUNC('month', CURRENT_DATE)::DATE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE usage_tracking IS 'Tracks monthly usage of parses, scores, and API calls per user for quota enforcement.';
COMMENT ON FUNCTION increment_parse_usage IS 'Increments parse counter for current billing period. Creates record if not exists.';
COMMENT ON FUNCTION increment_score_usage IS 'Increments score counter for current billing period. Creates record if not exists.';
COMMENT ON FUNCTION increment_api_call_usage IS 'Increments API call counter for current billing period. Creates record if not exists.';
COMMENT ON FUNCTION get_current_usage IS 'Returns current month usage statistics for a user.';