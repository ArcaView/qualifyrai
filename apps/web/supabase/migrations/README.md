# Supabase Database Migrations

This directory contains SQL migration files for the CV Overlay Web database schema.

## Migration Files

### 20250120_001_create_subscriptions.sql
Creates the `subscriptions` table for Stripe billing integration.

**Features:**
- Tracks user subscription status and billing periods
- Stores Stripe customer and subscription IDs
- Includes RLS policies for secure access
- Auto-updates `updated_at` timestamp

**Usage:** Updated via Stripe webhooks when subscriptions change

### 20250120_002_create_invoices.sql
Creates the `invoices` table for payment history.

**Features:**
- Stores invoice data from Stripe
- Tracks payment amounts, status, and PDF URLs
- Includes RLS policies for user privacy

**Usage:** Populated via Stripe webhooks when invoices are created/updated

### 20250120_003_create_api_keys.sql
Creates the `api_keys` table for secure API key management.

**Features:**
- Stores hashed API keys (never plain text)
- Tracks key prefix for display, expiration, and usage
- Includes function to auto-deactivate expired keys
- Includes RLS policies for secure access

**Usage:** Call from Edge Function to generate/manage API keys

**Helper Functions:**
- `deactivate_expired_api_keys()` - Auto-deactivates expired keys

### 20250120_004_create_usage_tracking.sql
Creates the `usage_tracking` table for quota enforcement.

**Features:**
- Tracks monthly parses, scores, and API calls per user
- Automatic period calculation (1st to last day of month)
- Helper functions for incrementing counters
- Includes RLS policies for user privacy

**Usage:** Call increment functions after each parse/score operation

**Helper Functions:**
- `increment_parse_usage(user_id, count)` - Increment parse counter
- `increment_score_usage(user_id, count)` - Increment score counter
- `increment_api_call_usage(user_id, count)` - Increment API call counter
- `get_current_usage(user_id)` - Get current month usage stats

### 20250120_005_create_analytics_events.sql
Creates the `analytics_events` table for user action tracking.

**Features:**
- Logs all user events (cv_parsed, candidate_scored, etc.)
- Stores event data as JSONB for flexibility
- Includes functions for aggregating events
- Powers dashboard analytics charts

**Usage:** Call `log_analytics_event()` after user actions

**Helper Functions:**
- `log_analytics_event(user_id, event_type, event_data, ip, user_agent)` - Log new event
- `get_user_event_counts(user_id, start_date, end_date)` - Count by event type
- `get_events_over_time(user_id, event_type, interval, start_date, end_date)` - Time-series data
- `get_monthly_api_calls(user_id, year, month)` - Get API call count

## Running Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-id

# Run all pending migrations
supabase db push

# Or run a specific migration
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20250120_001_create_subscriptions.sql
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **SQL Editor**
3. Copy and paste each migration file content
4. Run them in order (001, 002, 003, 004, 005)

### Option 3: Programmatically

```typescript
// Run migrations from your backend
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(url, serviceRoleKey)

const migrations = [
  '20250120_001_create_subscriptions.sql',
  '20250120_002_create_invoices.sql',
  '20250120_003_create_api_keys.sql',
  '20250120_004_create_usage_tracking.sql',
  '20250120_005_create_analytics_events.sql',
]

for (const migration of migrations) {
  const sql = fs.readFileSync(`supabase/migrations/${migration}`, 'utf8')
  await supabase.rpc('exec', { sql })
}
```

## Testing Migrations

After running migrations, verify tables were created:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscriptions', 'invoices', 'api_keys', 'usage_tracking', 'analytics_events');

-- Check RLS policies are enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('subscriptions', 'invoices', 'api_keys', 'usage_tracking', 'analytics_events');

-- Test a helper function
SELECT * FROM get_current_usage('your-user-id-here');
```

## Rollback

If you need to rollback migrations:

```sql
-- Drop tables (in reverse order due to dependencies)
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS usage_tracking CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS deactivate_expired_api_keys CASCADE;
DROP FUNCTION IF EXISTS increment_parse_usage CASCADE;
DROP FUNCTION IF EXISTS increment_score_usage CASCADE;
DROP FUNCTION IF EXISTS increment_api_call_usage CASCADE;
DROP FUNCTION IF EXISTS get_current_usage CASCADE;
DROP FUNCTION IF EXISTS log_analytics_event CASCADE;
DROP FUNCTION IF EXISTS get_user_event_counts CASCADE;
DROP FUNCTION IF EXISTS get_events_over_time CASCADE;
DROP FUNCTION IF EXISTS get_monthly_api_calls CASCADE;
```

## Integration Examples

### Tracking Parse Usage

```typescript
// In ParseCV.tsx or BulkParse.tsx after successful parse
await supabase.rpc('increment_parse_usage', {
  p_user_id: user.id,
  p_count: 1
})
```

### Logging Analytics Event

```typescript
// After candidate scoring
await supabase.rpc('log_analytics_event', {
  p_user_id: user.id,
  p_event_type: 'candidate_scored',
  p_event_data: { candidate_id: candidate.id, score: 85 }
})
```

### Checking Usage Quota

```typescript
// Before allowing parse operation
const { data: usage } = await supabase.rpc('get_current_usage', {
  p_user_id: user.id
})

const limit = currentPlan.monthly_parse_limit
if (usage.parses_used >= limit) {
  throw new Error('Monthly parse limit reached')
}
```

## Next Steps

After running these migrations:

1. ✅ Update application code to use new tables
2. ✅ Implement Stripe webhook handlers (Edge Functions)
3. ✅ Add quota enforcement to parse/score operations
4. ✅ Replace hardcoded analytics with real database queries
5. ✅ Implement API key generation in Settings page

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only view their own data
- Service role can perform admin operations
- API keys stored as bcrypt hashes (never plain text)
- Use `auth.uid()` in RLS policies for user-specific access

---

*Created: 2025-01-20*
*Part of: Pre-launch database schema implementation*
