# Database Setup Guide

This guide will help you set up the production database schema for Qualifyr.AI.

## Overview

The database schema includes the following tables:
- **user_profiles** - Extended user information
- **pricing_plans** - Configurable pricing (no more hardcoded!)
- **user_subscriptions** - Stripe subscription tracking
- **api_keys** - User API key management
- **roles** - Job roles/positions
- **candidates** - CV data and candidate information
- **api_usage_logs** - API usage tracking for billing
- **invoices** - Billing invoice history

## Step 1: Run the Database Schema

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the sidebar
3. Click **New Query**
4. Copy the entire contents of `DATABASE_SCHEMA.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

The script will:
- Create all necessary tables
- Set up Row Level Security (RLS) policies
- Create indexes for performance
- Add helper functions and triggers
- Seed default pricing plans

## Step 2: Verify the Schema

After running the schema, verify it was created successfully:

1. Go to **Database** > **Tables** in your Supabase dashboard
2. You should see these new tables:
   - `user_profiles`
   - `pricing_plans`
   - `user_subscriptions`
   - `api_keys`
   - `roles`
   - `candidates`
   - `api_usage_logs`
   - `invoices`

3. Check that the pricing plans were seeded:
   ```sql
   SELECT * FROM public.pricing_plans;
   ```
   You should see 3 plans: Starter, Professional, Enterprise

## Step 3: Enable Realtime (Optional)

For real-time updates in the UI:

1. Go to **Database** > **Replication**
2. Enable **Realtime** for these tables:
   - `candidates` (for live candidate updates)
   - `roles` (for live role updates)
   - `user_subscriptions` (for subscription changes)

## Step 4: Update Your Environment Variables

Add these to your `.env.local` file if using Stripe:

```env
# Existing Supabase variables
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe (for billing)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ParseScore API (if applicable)
VITE_PARSESCORE_API_URL=https://api.parsescore.com
VITE_PARSESCORE_API_KEY=your-api-key
```

## Step 5: Test the Database

Test that the schema is working:

1. Create a test user profile:
   ```sql
   -- Replace 'your-user-id' with your actual auth.users id
   INSERT INTO public.user_profiles (id, full_name, company_name)
   VALUES ('your-user-id', 'Test User', 'Test Company');
   ```

2. Verify RLS is working:
   - You should only see your own data
   - Other users cannot see your data

## Data Migration

If you have existing data in localStorage or React context that you want to preserve:

1. Export your current data from the browser console
2. Create a migration script to insert it into the new tables
3. Run the migration through Supabase SQL Editor

## Schema Updates

The schema includes automatic `updated_at` triggers. When you update any record:
- The `updated_at` field automatically updates to the current timestamp

## Pricing Plans

The schema includes 3 default pricing plans. To update pricing:

```sql
-- Update a plan's price
UPDATE public.pricing_plans
SET price_monthly = 49.99
WHERE slug = 'starter';

-- Add a new feature to a plan
UPDATE public.pricing_plans
SET features = features || '["New feature"]'::jsonb
WHERE slug = 'professional';

-- Deactivate a plan (users keep their subscription)
UPDATE public.pricing_plans
SET is_active = false
WHERE slug = 'old-plan';
```

## Analytics View

The schema includes a `user_statistics` view for quick analytics:

```sql
-- Get statistics for the current user
SELECT * FROM public.user_statistics
WHERE user_id = auth.uid();
```

This view provides:
- Total candidates
- Total roles
- Shortlisted/hired counts
- Average candidate score
- API usage stats

## Troubleshooting

### Tables not created

- Check for SQL errors in the Supabase SQL Editor
- Ensure you have proper permissions
- Try running the schema in smaller chunks

### RLS policies blocking access

- Verify you're authenticated
- Check that `auth.uid()` matches the `user_id` in the table
- Review RLS policies in **Database** > **Policies**

### Missing data

- Check that triggers are enabled
- Verify foreign key relationships
- Ensure data types match

## Security Notes

1. **RLS is enabled** on all tables - users can only access their own data
2. **API keys are hashed** - store full keys securely on first generation
3. **Admin emails** - Update the admin email list in existing impersonation policies to match your environment variables
4. **Sensitive data** - Never log full API keys or passwords

## Next Steps

After setting up the database:

1. ✅ Update RolesContext to fetch from database
2. ✅ Replace mock data in components
3. ✅ Implement backend APIs for profile/API key management
4. ✅ Set up Stripe webhooks for subscription management
5. ✅ Add error tracking (Sentry)

## Support

If you encounter issues:
- Check Supabase logs: **Logs** > **Database**
- Review RLS policies: **Database** > **Policies**
- Test queries in SQL Editor
