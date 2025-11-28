# Troubleshooting: Verify Payment 400 Error

## What's Happening

The `verify-payment` Edge Function is returning a 400 error. This happens when Stripe checkout succeeds, but the function can't verify it and create your subscription.

## Most Likely Cause

The `pricing_plans` table is missing **Stripe Price IDs**. When Stripe returns after payment, the function tries to look up which plan was purchased using the price ID, but can't find it.

Here's the failing code (verify-payment/index.ts:93-103):
```typescript
// Look up the pricing plan by stripe_price_id_monthly
const { data: pricingPlan, error: planError } = await supabaseClient
  .from('pricing_plans')
  .select('id, name, slug')
  .eq('stripe_price_id_monthly', priceId)  // ← This lookup fails if price ID is NULL
  .single();

if (planError || !pricingPlan) {
  throw new Error('Pricing plan not found for this subscription');  // ← Returns 400
}
```

## Quick Diagnosis

Run this SQL in your Supabase SQL Editor to check:

```sql
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
```

**Expected**: All rows should show "✅ Configured"
**Actual**: Probably showing "❌ Missing"

## The Fix: Complete Stripe Setup

You need to complete the **5-step setup** in `STRIPE_SETUP_GUIDE.md`:

### Step 1: Create Products in Stripe (5 minutes)

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"+ Add Product"**
3. Create 3 products:
   - **QualifyRAI Starter** - £49.99/month recurring
   - **QualifyRAI Professional** - £79.99/month recurring
   - **QualifyRAI Enterprise** - £119.99/month recurring
4. **Copy the Price IDs** (they look like `price_1ABC...`)

### Step 2: Update Database (1 minute)

Run this SQL in Supabase, replacing with your actual Price IDs:

```sql
UPDATE pricing_plans SET stripe_price_id_monthly = 'price_1ABC...' WHERE slug = 'starter';
UPDATE pricing_plans SET stripe_price_id_monthly = 'price_1GHI...' WHERE slug = 'professional';
UPDATE pricing_plans SET stripe_price_id_monthly = 'price_1MNO...' WHERE slug = 'enterprise';

-- Verify it worked
SELECT name, stripe_price_id_monthly FROM pricing_plans
WHERE slug IN ('starter', 'professional', 'enterprise');
```

### Step 3: Configure STRIPE_SECRET_KEY (1 minute)

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_...`)
3. Go to: https://supabase.com/dashboard/project/nxteuyzcxabqpelingje/settings/functions
4. Add secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_...` (paste your key)

### Step 4: Deploy Edge Functions (2 minutes)

```bash
cd apps/web

# Link project (if not done)
supabase link --project-ref nxteuyzcxabqpelingje

# Deploy the functions
supabase functions deploy verify-payment
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
```

### Step 5: Test Again

1. Go to signup page: http://192.168.56.1:8080/complete-signup
2. Click "Get Started" on any plan
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Should redirect back and verify successfully ✅

## Other Possible Causes

If Stripe Price IDs are already set, check:

### STRIPE_SECRET_KEY Not Set
```bash
# Check if secret is configured (won't show value, just confirms it exists)
supabase secrets list --project-ref nxteuyzcxabqpelingje
```

Should show `STRIPE_SECRET_KEY` in the list.

### Edge Function Not Deployed
The function might be old or not deployed. Deploy it:
```bash
cd apps/web
supabase functions deploy verify-payment
```

### Wrong Stripe Mode
If you created products in **Live Mode** but are using **Test Mode** key (or vice versa):
- Test mode: Products and keys both have `test` in URLs/names
- Live mode: No `test` prefix

Make sure both match!

## How to Read the Error

Open browser DevTools (F12) → Console tab. Look for:

```
Payment verification error: FunctionsHttpError: Edge Function returned a non-2xx status code
```

Then check **Network tab** → Click the failed request → **Preview/Response** to see the actual error message. It will say something like:
- `"Pricing plan not found for this subscription"` ← Missing price IDs
- `"No authorization header"` ← Edge Function deployment issue
- `"Payment not completed"` ← Stripe session issue
- `"STRIPE_SECRET_KEY"` ← Missing API key

## Summary: What You Need

- [ ] **3 Stripe Products** created in test mode
- [ ] **3 Price IDs** copied from Stripe
- [ ] **Database updated** with price IDs
- [ ] **STRIPE_SECRET_KEY** configured in Supabase
- [ ] **Edge Functions deployed** (verify-payment, create-checkout-session)

Once all ✅, the payment flow will work!

## Need Help?

If you're still stuck after following these steps:
1. Share the exact error message from browser DevTools
2. Share the output of the SQL check query
3. Confirm which steps you've completed

See the full guide: **STRIPE_SETUP_GUIDE.md**
