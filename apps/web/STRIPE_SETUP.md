# Stripe Integration Setup Guide

This guide walks you through setting up Stripe billing integration for production.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Supabase project set up
3. Access to your Supabase Edge Functions environment

## Step 1: Get Stripe API Keys

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** and **Secret key**
   - For testing: Use test mode keys (starts with `pk_test_` and `sk_test_`)
   - For production: Use live mode keys (starts with `pk_live_` and `sk_live_`)

## Step 2: Configure Environment Variables

### Frontend (.env)

Add to your `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_ for testing
Supabase Edge Functions
Set these secrets using the Supabase CLI:

supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_URL=https://yourdomain.com
Step 3: Deploy Edge Functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
Step 4: Set Up Stripe Webhook
Go to Developers → Webhooks in Stripe Dashboard
Click Add endpoint
Enter: https://your-project.supabase.co/functions/v1/stripe-webhook
Select events:
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_succeeded
invoice.payment_failed
checkout.session.completed
Copy the Signing secret and update Supabase secrets
Testing
Use Stripe test cards: https://stripe.com/docs/testing

Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
Security Checklist
✅ Never expose secret keys in frontend code
✅ Validate webhook signatures
✅ Use HTTPS in production
✅ Enable RLS policies on all tables
✅ Use environment variables for all keys
Resources
Stripe Billing Documentation
Stripe Webhooks Guide
Supabase Edge Functions
