# Stripe Setup Guide for QualifyRAI

## The Problem

You're seeing "Configuration Error: This plan is not yet configured" because the pricing_plans table has NULL values for `stripe_price_id_monthly` and `stripe_price_id_yearly`.

These fields tell the app which Stripe prices to use when creating checkout sessions.

## Step 1: Create Products in Stripe Dashboard

1. Go to your Stripe Dashboard: https://dashboard.stripe.com/products
2. Click **"+ Add Product"** for each plan

### Starter Plan
- **Name**: QualifyRAI Starter
- **Description**: Perfect for small teams getting started
- **Pricing**:
  - Monthly: £49.99 GBP (Recurring)
  - Yearly: £499.99 GBP (Recurring - save 17%)
- Click **Save product**
- **Copy the Price IDs** (they look like `price_1ABC...` and `price_1XYZ...`)

### Professional Plan
- **Name**: QualifyRAI Professional
- **Description**: Perfect for growing recruitment teams
- **Pricing**:
  - Monthly: £79.99 GBP (Recurring)
  - Yearly: £799.99 GBP (Recurring - save 17%)
- Click **Save product**
- **Copy the Price IDs**

### Enterprise Plan
- **Name**: QualifyRAI Enterprise
- **Description**: For large organizations with custom needs
- **Pricing**:
  - Monthly: £119.99 GBP (Recurring)
  - Yearly: £1,199.99 GBP (Recurring - save 17%)
- Click **Save product**
- **Copy the Price IDs**

## Step 2: Update Database with Stripe Price IDs

Once you have all the Stripe Price IDs, run this SQL in your Supabase SQL Editor:

```sql
-- Update Starter plan
UPDATE pricing_plans
SET
  stripe_price_id_monthly = 'price_XXXXX_starter_monthly',  -- Replace with your actual price ID
  stripe_price_id_yearly = 'price_XXXXX_starter_yearly'     -- Replace with your actual price ID
WHERE slug = 'starter';

-- Update Professional plan
UPDATE pricing_plans
SET
  stripe_price_id_monthly = 'price_XXXXX_professional_monthly',
  stripe_price_id_yearly = 'price_XXXXX_professional_yearly'
WHERE slug = 'professional';

-- Update Enterprise plan
UPDATE pricing_plans
SET
  stripe_price_id_monthly = 'price_XXXXX_enterprise_monthly',
  stripe_price_id_yearly = 'price_XXXXX_enterprise_yearly'
WHERE slug = 'enterprise';

-- Verify the update
SELECT name, slug, price_monthly, stripe_price_id_monthly, stripe_price_id_yearly
FROM pricing_plans
WHERE slug IN ('starter', 'professional', 'enterprise');
```

## Step 3: Configure Stripe Environment Variables in Supabase

The Edge Functions need your Stripe API key to create checkout sessions.

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_...` for test mode)
3. Go to Supabase Dashboard: https://supabase.com/dashboard/project/nxteuyzcxabqpelingje/settings/functions
4. Under "Function secrets", add:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: `sk_test_...` (your Stripe secret key)
5. Click **Add secret**

**Note**: The following are already automatically available:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

You may also want to add:
- **Name**: `APP_URL`
- **Value**: `http://192.168.56.1:8080` (or your production URL)

## Step 4: Deploy Stripe Edge Functions

You need to deploy the Edge Functions that handle Stripe payments:

```bash
cd apps/web

# Link to your project (if not already done)
supabase link --project-ref nxteuyzcxabqpelingje

# Deploy all Stripe-related functions
supabase functions deploy create-checkout-session
supabase functions deploy verify-payment
supabase functions deploy create-portal-session
```

**Important**: If you get authentication errors, run:
```bash
supabase login
```

## Step 5: Verify Setup

1. Refresh your signup page: http://192.168.56.1:8080/complete-signup
2. The "Configuration Error" should be gone
3. Clicking "Get Started" should redirect to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC

## Finding Your Stripe Price IDs

If you already created products but need to find the Price IDs:

1. Go to https://dashboard.stripe.com/products
2. Click on a product (e.g., "QualifyRAI Starter")
3. Under "Pricing", you'll see your prices
4. Click on a price (e.g., "£49.99/month")
5. The Price ID is at the top (looks like `price_1ABC123XYZ...`)
6. Copy it and use it in the SQL above

## Stripe Test Mode vs Live Mode

**Important**: If you're testing, make sure you're in **Test Mode** (toggle in top-right of Stripe Dashboard).

- Test mode price IDs start with `price_` and work with test cards
- Live mode price IDs also start with `price_` but charge real cards
- Your Supabase Edge Functions need the correct API keys:
  - Test: `STRIPE_SECRET_KEY` should be `sk_test_...`
  - Live: `STRIPE_SECRET_KEY` should be `sk_live_...`

## Common Issues

### "No such price" error
- You're using a live mode price ID but Stripe is in test mode (or vice versa)
- Check your `STRIPE_SECRET_KEY` environment variable matches the mode

### "Configuration Error" still showing
- Make sure you ran the UPDATE SQL and it returned "1 row updated" for each plan
- Verify with: `SELECT * FROM pricing_plans WHERE stripe_price_id_monthly IS NOT NULL;`
- Refresh the page (hard refresh: Ctrl+Shift+R)

### Can't create recurring prices
- Make sure "Recurring" is selected when creating prices in Stripe
- Set billing period to "Monthly" or "Yearly"

## Example: Complete Stripe Setup

Here's what your Stripe Products should look like:

```
QualifyRAI Starter
├─ Monthly: £49.99/month → price_1ABC123...
└─ Yearly: £499.99/year → price_1DEF456...

QualifyRAI Professional
├─ Monthly: £79.99/month → price_1GHI789...
└─ Yearly: £799.99/year → price_1JKL012...

QualifyRAI Enterprise
├─ Monthly: £119.99/month → price_1MNO345...
└─ Yearly: £1,199.99/year → price_1PQR678...
```

Then your SQL would be:

```sql
UPDATE pricing_plans
SET
  stripe_price_id_monthly = 'price_1ABC123...',
  stripe_price_id_yearly = 'price_1DEF456...'
WHERE slug = 'starter';

UPDATE pricing_plans
SET
  stripe_price_id_monthly = 'price_1GHI789...',
  stripe_price_id_yearly = 'price_1JKL012...'
WHERE slug = 'professional';

UPDATE pricing_plans
SET
  stripe_price_id_monthly = 'price_1MNO345...',
  stripe_price_id_yearly = 'price_1PQR678...'
WHERE slug = 'enterprise';
```

## Quick Checklist

- [ ] Created 3 products in Stripe (Starter, Professional, Enterprise)
- [ ] Each product has 2 recurring prices (monthly and yearly)
- [ ] Copied all 6 Price IDs from Stripe
- [ ] Ran UPDATE SQL in Supabase to set stripe_price_id_monthly and stripe_price_id_yearly
- [ ] Verified with SELECT query that price IDs are set
- [ ] Refreshed signup page - no more "Configuration Error"
- [ ] Test checkout flow with Stripe test card (4242 4242 4242 4242)

## Next Steps

After completing this setup:
1. Test the full payment flow with a Stripe test card
2. Verify the `verify-payment` Edge Function creates subscriptions correctly
3. Check that users get the correct plan limits after payment
4. Set up Stripe webhooks for subscription updates/cancellations (covered in separate guide)
