-- ============================================================
-- Qualifyr.AI Database Schema
-- ============================================================
-- This schema includes all core tables needed for production
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. USER PROFILES TABLE
-- ============================================================
-- Extended user information beyond auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  phone_number TEXT,
  job_title TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{"email": true, "push": false}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at DESC);

-- ============================================================
-- 2. PRICING PLANS TABLE
-- ============================================================
-- Configurable pricing plans (no more hardcoded pricing!)
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- e.g., 'starter', 'professional', 'enterprise'
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  currency TEXT DEFAULT 'GBP' NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of feature strings
  limits JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"cvs_per_month": 100, "api_calls": 1000}
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active pricing plans
CREATE POLICY "Anyone can view active pricing plans"
  ON public.pricing_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON public.pricing_plans(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_slug ON public.pricing_plans(slug);

-- ============================================================
-- 3. USER SUBSCRIPTIONS TABLE
-- ============================================================
-- Track user subscription status
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.pricing_plans(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- ============================================================
-- 4. API KEYS TABLE
-- ============================================================
-- Store user API keys for ParseScore API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars, e.g., 'ps_live_'
  key_hash TEXT NOT NULL, -- Hashed version of the full key
  environment TEXT NOT NULL CHECK (environment IN ('live', 'test')),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(key_hash)
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);

-- ============================================================
-- 5. ROLES TABLE
-- ============================================================
-- Job roles/positions to match candidates against
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'freelance')),
  salary_min DECIMAL(10, 2),
  salary_max DECIMAL(10, 2),
  salary_currency TEXT DEFAULT 'GBP',
  description TEXT,
  requirements JSONB DEFAULT '[]'::jsonb, -- Array of requirement strings
  preferred_qualifications JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles"
  ON public.roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roles"
  ON public.roles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roles"
  ON public.roles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_user ON public.roles(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_active ON public.roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_created_at ON public.roles(created_at DESC);

-- ============================================================
-- 6. CANDIDATES TABLE
-- ============================================================
-- Candidates parsed from CVs
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,

  -- Personal Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,

  -- CV Data
  cv_file_name TEXT,
  cv_file_url TEXT,
  cv_parsed_data JSONB, -- Full parsed CV data from ParseScore API

  -- Scoring & Matching
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  skills_match_score INTEGER CHECK (skills_match_score >= 0 AND skills_match_score <= 100),
  experience_score INTEGER CHECK (experience_score >= 0 AND experience_score <= 100),
  education_score INTEGER CHECK (education_score >= 0 AND education_score <= 100),

  -- Extracted Information
  skills JSONB DEFAULT '[]'::jsonb, -- Array of skills
  experience JSONB DEFAULT '[]'::jsonb, -- Array of work experiences
  education JSONB DEFAULT '[]'::jsonb, -- Array of education entries
  certifications JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,

  -- Status & Notes
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected')),
  notes TEXT,
  interview_notes JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  source TEXT, -- How candidate was added (e.g., 'upload', 'api', 'email')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own candidates"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidates"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidates"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_user ON public.candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_role ON public.candidates(role_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON public.candidates(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON public.candidates(created_at DESC);

-- ============================================================
-- 7. API USAGE LOGS TABLE
-- ============================================================
-- Track API usage for billing and analytics
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL, -- e.g., '/parse', '/score', '/batch'
  method TEXT NOT NULL, -- GET, POST, etc.
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB, -- Additional context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own API usage logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON public.api_usage_logs(endpoint);

-- ============================================================
-- 8. INVOICES TABLE
-- ============================================================
-- Store billing invoices from Stripe
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf_url TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON public.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED DATA - DEFAULT PRICING PLANS
-- ============================================================

INSERT INTO public.pricing_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_popular, sort_order)
VALUES
  (
    'Starter',
    'starter',
    'Perfect for small teams getting started',
    39.99,
    399.99,
    '["100 CVs per month", "Basic AI matching", "Email support", "1 user seat", "Basic analytics"]'::jsonb,
    '{"cvs_per_month": 100, "api_calls_per_month": 500, "users": 1}'::jsonb,
    false,
    1
  ),
  (
    'Professional',
    'professional',
    'For growing recruitment teams',
    79.99,
    799.99,
    '["500 CVs per month", "Advanced AI matching", "Priority support", "5 user seats", "Advanced analytics", "Custom workflows", "API access"]'::jsonb,
    '{"cvs_per_month": 500, "api_calls_per_month": 2500, "users": 5}'::jsonb,
    true,
    2
  ),
  (
    'Enterprise',
    'enterprise',
    'For large organisations',
    119.99,
    1199.99,
    '["Unlimited CVs", "Premium AI matching", "24/7 support", "Unlimited users", "Custom integrations", "Dedicated account manager", "Advanced API access", "White-label options"]'::jsonb,
    '{"cvs_per_month": -1, "api_calls_per_month": -1, "users": -1}'::jsonb,
    false,
    3
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ANALYTICS VIEWS
-- ============================================================

-- View: User statistics summary
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

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================
-- Schema created successfully!
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Update your environment variables
-- 3. Update frontend code to use these tables instead of mock data
