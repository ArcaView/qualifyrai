-- Check if pricing plans have Stripe price IDs configured
SELECT 
  name,
  slug,
  price_monthly,
  stripe_price_id_monthly,
  CASE 
    WHEN stripe_price_id_monthly IS NULL THEN '❌ Missing'
    ELSE '✅ Configured'
  END as status
FROM pricing_plans
WHERE slug IN ('starter', 'professional', 'enterprise')
ORDER BY sort_order;
