# Edge Functions Deployment Guide

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Authenticated with Supabase: `supabase login`
- Linked to your Supabase project: `supabase link --project-ref nxteuyzcxabqpelingje`

## Functions to Deploy

### 1. create-portal-session (UPDATED - REQUIRED)

**Purpose**: Creates Stripe Customer Portal sessions for subscription management

**Deploy**:
```bash
cd apps/web
supabase functions deploy create-portal-session
```

**Environment Variables Required**:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `APP_URL` - Your application URL (e.g., https://yourdomain.com)

**Recent Changes**:
- Updated Deno std to 0.177.0
- Updated Stripe to 17.4.0
- Updated Stripe API version to 2024-12-18.acacia
- Changed return URL to `/dashboard/billing`

**Test**:
1. Log in to your application
2. Navigate to `/dashboard/billing`
3. Click "Manage Billing" button
4. Should redirect to Stripe Customer Portal
5. Verify portal shows subscription details

### 2. verify-payment (CRITICAL)

**Purpose**: Verifies Stripe checkout sessions and creates subscription records

**Deploy**:
```bash
cd apps/web
supabase functions deploy verify-payment
```

**Test**:
1. Sign up as new user
2. Complete payment on CompleteSignup page
3. After Stripe redirect, should verify payment automatically
4. Should redirect to dashboard after verification

### 3. create-checkout-session (UPDATED)

**Purpose**: Creates Stripe Checkout sessions for new subscriptions

**Deploy**:
```bash
cd apps/web
supabase functions deploy create-checkout-session
```

**Recent Changes**:
- Added `subscription_data.metadata` with user_id
- Updated success URL to `/complete-signup?success=true&session_id={CHECKOUT_SESSION_ID}`

### 4. stripe-webhook (RECOMMENDED - Future)

**Purpose**: Handles Stripe webhook events for subscription lifecycle

**Status**: Not yet deployed
**Priority**: Medium (needed for subscription renewals, cancellations, updates)

**Deploy**:
```bash
cd apps/web
supabase functions deploy stripe-webhook
```

**After Deployment**:
1. Get webhook URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
2. Add to Stripe Dashboard → Developers → Webhooks
3. Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Set webhook secret in Supabase: `STRIPE_WEBHOOK_SECRET`

## Deployment Status

✅ Code Ready:
- create-portal-session
- verify-payment
- create-checkout-session

⏳ Needs Deployment:
- All functions above (if not already deployed)

📋 Future:
- stripe-webhook (for subscription lifecycle events)

## Verification Checklist

After deploying create-portal-session:
- [ ] Function deployed successfully
- [ ] Environment variables set in Supabase dashboard
- [ ] Test "Manage Billing" button on /dashboard/billing
- [ ] Verify Stripe Customer Portal opens
- [ ] Test updating payment method in portal
- [ ] Test viewing invoices in portal
- [ ] Verify return to /dashboard/billing after portal session

## Troubleshooting

**401 Unauthorized**:
- Check STRIPE_SECRET_KEY is set correctly
- Verify user has active subscription

**No subscription found error**:
- Check user has subscription record in database
- Verify subscription status is 'active'
- Check stripe_customer_id exists

**Portal URL not returned**:
- Check Stripe API version compatibility
- Verify customer ID exists in Stripe
- Check function logs: `supabase functions logs create-portal-session`

## Next Steps After Deployment

1. **Test Subscription Management Flow**
   - Create test subscription
   - Access billing page
   - Test portal features

2. **Configure Webhook** (when ready)
   - Deploy stripe-webhook function
   - Configure in Stripe Dashboard
   - Test subscription lifecycle events

3. **Monitor Function Logs**
   ```bash
   supabase functions logs create-portal-session --tail
   ```

4. **Switch to Live Mode** (before launch)
   - Update STRIPE_SECRET_KEY to live key
   - Update all price IDs to live versions
   - Update webhook endpoint to live mode
   - Test with real payment method
