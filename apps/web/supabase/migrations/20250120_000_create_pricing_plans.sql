-- Migration: Create pricing_plans table
-- Created: 2025-01-20
-- Purpose: Define subscription plans and their limits

-- Create pricing_plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly NUMERIC(10,2),
  price_currency TEXT DEFAULT 'GBP' NOT NULL,
  limits JSONB NOT NULL DEFAULT '{}',
  features JSONB DEFAULT '[]',
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_plans_slug ON pricing_plans(slug);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_is_active ON pricing_plans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pricing_plans_sort_order ON pricing_plans(sort_order);

-- Enable Row Level Security
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active pricing plans
DROP POLICY IF EXISTS "Anyone can view active pricing plans" ON pricing_plans;
CREATE POLICY "Anyone can view active pricing plans"
  ON pricing_plans
  FOR SELECT
  USING (is_active = TRUE);

-- RLS Policy: Service role can manage all pricing plans
DROP POLICY IF EXISTS "Service role can manage pricing plans" ON pricing_plans;
CREATE POLICY "Service role can manage pricing plans"
  ON pricing_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pricing_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_pricing_plans_updated_at ON pricing_plans;
CREATE TRIGGER trigger_update_pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_plans_updated_at();

-- Seed default pricing plans
INSERT INTO pricing_plans (name, slug, description, price_monthly, price_yearly, limits, features, is_popular, sort_order) VALUES
(
  'Free',
  'free',
  'Perfect for trying out QualifyRAI',
  0.00,
  0.00,
  '{
    "cvs_per_month": 10,
    "max_parses": 10,
    "max_scores": 10,
    "ai_scoring_enabled": false,
    "api_access": false,
    "bulk_parsing": false
  }',
  '[
    "10 CV parses per month",
    "Basic scoring (rule-based)",
    "Email support",
    "Single user"
  ]',
  false,
  1
),
(
  'Basic',
  'basic',
  'Great for small teams and recruiters',
  29.00,
  290.00,
  '{
    "cvs_per_month": 100,
    "max_parses": 100,
    "max_scores": 100,
    "ai_scoring_enabled": false,
    "api_access": true,
    "bulk_parsing": false
  }',
  '[
    "100 CV parses per month",
    "Basic scoring (rule-based)",
    "API access",
    "Email support",
    "Up to 3 users"
  ]',
  false,
  2
),
(
  'Professional',
  'professional',
  'Perfect for growing recruitment teams',
  79.00,
  790.00,
  '{
    "cvs_per_month": 500,
    "max_parses": 500,
    "max_scores": 500,
    "ai_scoring_enabled": true,
    "api_access": true,
    "bulk_parsing": true
  }',
  '[
    "500 CV parses per month",
    "AI-powered scoring with insights",
    "Bulk CV parsing",
    "API access with webhooks",
    "Priority email support",
    "Up to 10 users",
    "Custom job descriptions",
    "Export to ATS"
  ]',
  true,
  3
),
(
  'Enterprise',
  'enterprise',
  'For large organizations with custom needs',
  199.00,
  1990.00,
  '{
    "cvs_per_month": -1,
    "max_parses": 999999,
    "max_scores": 999999,
    "ai_scoring_enabled": true,
    "api_access": true,
    "bulk_parsing": true,
    "custom_integrations": true,
    "dedicated_support": true
  }',
  '[
    "Unlimited CV parses",
    "AI-powered scoring with insights",
    "Bulk CV parsing",
    "Full API access with webhooks",
    "Dedicated account manager",
    "Unlimited users",
    "Custom integrations",
    "SLA guarantee",
    "SSO/SAML support",
    "On-premise deployment option"
  ]',
  false,
  4
)
ON CONFLICT (slug) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE pricing_plans IS 'Subscription plans with pricing and feature limits';
COMMENT ON COLUMN pricing_plans.slug IS 'URL-friendly unique identifier for the plan';
COMMENT ON COLUMN pricing_plans.limits IS 'JSONB object containing plan limits (max_parses, ai_scoring_enabled, etc.)';
COMMENT ON COLUMN pricing_plans.features IS 'Array of feature descriptions shown on pricing page';
COMMENT ON COLUMN pricing_plans.is_popular IS 'Flag to highlight the recommended plan';
COMMENT ON COLUMN pricing_plans.sort_order IS 'Display order on pricing page (lower numbers first)';
