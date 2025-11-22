-- Migration: Create analytics_events table for tracking user actions
-- Created: 2025-01-20
-- Purpose: Track user events for analytics dashboard and metrics

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'cv_parsed', 'candidate_scored', 'role_created', etc.
  event_data JSONB, -- Additional event-specific data
  ip_address INET, -- For geographic analytics
  user_agent TEXT, -- Browser/device information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type_date ON analytics_events(event_type, created_at DESC);
DROP INDEX IF EXISTS idx_analytics_event_data;
CREATE INDEX idx_analytics_event_data ON analytics_events USING GIN (event_data);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own events
DROP POLICY IF EXISTS "Users can view their own analytics events" ON analytics_events;
CREATE POLICY "Users can view their own analytics events"
  ON analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert events
DROP POLICY IF EXISTS "Service role can insert analytics events" ON analytics_events;
CREATE POLICY "Service role can insert analytics events"
  ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Service role can read all events (for admin dashboard)
DROP POLICY IF EXISTS "Service role can read all analytics events" ON analytics_events;
CREATE POLICY "Service role can read all analytics events"
  ON analytics_events
  FOR SELECT
  USING (true);

-- Function to log an analytics event
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

-- Function to get event counts by type for a user
CREATE OR REPLACE FUNCTION get_user_event_counts(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.event_type,
    COUNT(*)::BIGINT as event_count
  FROM analytics_events ae
  WHERE ae.user_id = p_user_id
    AND (p_start_date IS NULL OR ae.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ae.created_at <= p_end_date)
  GROUP BY ae.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get events over time (for charts)
CREATE OR REPLACE FUNCTION get_events_over_time(
  p_user_id UUID,
  p_event_type TEXT DEFAULT NULL,
  p_interval TEXT DEFAULT 'day', -- 'hour', 'day', 'week', 'month'
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  time_bucket TIMESTAMP WITH TIME ZONE,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC(p_interval, ae.created_at) as time_bucket,
    COUNT(*)::BIGINT as event_count
  FROM analytics_events ae
  WHERE ae.user_id = p_user_id
    AND (p_event_type IS NULL OR ae.event_type = p_event_type)
    AND ae.created_at >= p_start_date
    AND ae.created_at <= p_end_date
  GROUP BY time_bucket
  ORDER BY time_bucket ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top API calls (for Overview.tsx "Total API calls this month")
CREATE OR REPLACE FUNCTION get_monthly_api_calls(
  p_user_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM analytics_events
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM created_at) = p_year
    AND EXTRACT(MONTH FROM created_at) = p_month;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE analytics_events IS 'Stores user action events for analytics and metrics. Powers dashboard charts.';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event: cv_parsed, candidate_scored, role_created, etc.';
COMMENT ON COLUMN analytics_events.event_data IS 'JSON data specific to event type (e.g., {score: 85, candidate_id: "..."})';
COMMENT ON FUNCTION log_analytics_event IS 'Logs a new analytics event. Call after user actions to track metrics.';
COMMENT ON FUNCTION get_user_event_counts IS 'Returns count of each event type for a user in a date range.';
COMMENT ON FUNCTION get_events_over_time IS 'Returns time-series data for charting events (day/week/month buckets).';
COMMENT ON FUNCTION get_monthly_api_calls IS 'Returns total API calls for current month. Used in Overview.tsx.';