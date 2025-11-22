-- Migration: Create subscriptions table for Stripe billing integration
-- Created: 2025-01-20
-- Purpose: Track user subscription data from Stripe

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan_id UUID REFERENCES pricing_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own subscriptions (for cancel_at_period_end)
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Service role can insert subscriptions (webhook handler)
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON subscriptions;
CREATE POLICY "Service role can insert subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Service role can update subscriptions (webhook handler)
DROP POLICY IF EXISTS "Service role can update all subscriptions" ON subscriptions;
CREATE POLICY "Service role can update all subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE subscriptions IS 'Stores Stripe subscription data for users. Updated via Stripe webhooks.';