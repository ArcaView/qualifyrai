-- Update pricing plans to add AI scoring limits
-- Starter: 10 AI scores, Professional: 25 AI scores, Enterprise: Unlimited

-- Update Starter plan - Add 10 AI scores
UPDATE pricing_plans
SET
  limits = '{
    "cvs_per_month": 100,
    "max_parses": 100,
    "max_scores": 100,
    "ai_scoring_enabled": true,
    "max_ai_scores": 10,
    "api_access": true,
    "bulk_parsing": false
  }'::jsonb,
  features = '[
    "100 CV parses per month",
    "10 AI-powered scores per month",
    "Basic rule-based scoring (unlimited)",
    "API access",
    "Email support",
    "Up to 3 users"
  ]'::jsonb
WHERE slug = 'starter';

-- Update Professional plan - Add 25 AI scores
UPDATE pricing_plans
SET
  limits = '{
    "cvs_per_month": 500,
    "max_parses": 500,
    "max_scores": 500,
    "ai_scoring_enabled": true,
    "max_ai_scores": 25,
    "api_access": true,
    "bulk_parsing": true
  }'::jsonb,
  features = '[
    "500 CV parses per month",
    "25 AI-powered scores per month",
    "Bulk CV parsing",
    "API access with webhooks",
    "Priority email support",
    "Up to 10 users",
    "Custom job descriptions",
    "Export to ATS"
  ]'::jsonb
WHERE slug = 'professional';

-- Update Enterprise plan - Unlimited AI scores
UPDATE pricing_plans
SET
  limits = '{
    "cvs_per_month": -1,
    "max_parses": 999999,
    "max_scores": 999999,
    "ai_scoring_enabled": true,
    "max_ai_scores": -1,
    "api_access": true,
    "bulk_parsing": true,
    "custom_integrations": true,
    "dedicated_support": true
  }'::jsonb,
  features = '[
    "Unlimited CV parses",
    "Unlimited AI-powered scores",
    "Bulk CV parsing",
    "Full API access with webhooks",
    "Dedicated account manager",
    "Unlimited users",
    "Custom integrations",
    "SLA guarantee",
    "SSO/SAML support",
    "On-premise deployment option"
  ]'::jsonb
WHERE slug = 'enterprise';

-- Verify the changes
SELECT
  name,
  slug,
  price_monthly,
  limits->>'ai_scoring_enabled' as ai_enabled,
  limits->>'max_ai_scores' as ai_score_limit,
  features
FROM pricing_plans
WHERE slug IN ('starter', 'professional', 'enterprise')
ORDER BY sort_order;
