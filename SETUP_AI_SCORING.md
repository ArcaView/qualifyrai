# Setup Guide: Fix AI Scoring Feature

This guide will fix the two 404 errors preventing AI scoring from working:
1. Analytics 404 - `log_analytics_event` function missing
2. ParseScore CV 404 - CVs not being persisted (no database configured)

## Step 1: Apply Analytics Migration (Web App)

This fixes the `log_analytics_event` 404 error in the browser console.

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/nxteuyzcxabqpelingje/sql/new
2. Copy the contents of `apps/web/supabase/fix-analytics.sql`
3. Paste and run in the SQL Editor
4. You should see: "Analytics migration applied successfully!"

## Step 2: Setup ParseScore Database Schema

This creates the database tables needed for CV persistence.

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/nxteuyzcxabqpelingje/sql/new
2. Copy the contents of `apps/web/supabase/setup-parsescore-schema.sql`
3. Paste and run in the SQL Editor
4. You should see: "ParseScore schema created successfully!"

**What this creates:**
- Schema: `parsescore` (separate from web app tables)
- Tables: `parsescore.api_keys`, `parsescore.parsed_cvs`, `parsescore.scoring_results`, `parsescore.job_profiles`

## Step 3: Configure ParseScore API Environment

The ParseScore API needs database and LLM credentials to work.

1. Get your Supabase database password:
   - Go to: https://supabase.com/dashboard/project/nxteuyzcxabqpelingje/settings/database
   - Copy the password (it's under "Database Settings" → "Connection string")

2. Edit `apps/api/.env` and replace placeholders:
   ```bash
   # Replace [YOUR-DATABASE-PASSWORD] with your actual password
   DATABASE_URL=postgresql+psycopg://postgres.nxteuyzcxabqpelingje:YOUR_PASSWORD_HERE@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?options=-c%20search_path%3Dparsescore,public

   # Replace with your OpenAI API key (for AI scoring)
   LLM_API_KEY=sk-your-actual-openai-key-here
   LLM_ENABLED=true
   ```

## Step 4: Restart ParseScore API

After configuring the environment:

1. Stop the ParseScore API if it's running (Ctrl+C)
2. Restart it:
   ```bash
   cd apps/api
   python -m uvicorn app.main:app --reload --port 8000
   ```

3. Check the logs - you should see:
   ```
   INFO: Connected to database
   INFO: Application startup complete
   ```

## Step 5: Test AI Scoring

1. Go to the web app: http://localhost:8080/dashboard/parse-cv
2. Upload a CV
3. Paste a job description
4. Click "AI Score This Candidate" (if you have Professional/Enterprise plan)
5. Check browser console - no more 404 errors!
6. Check ParseScore logs - should see:
   ```
   INFO: "POST /v1/parse?persist=true HTTP/1.1" 200 OK
   INFO: "GET /v1/cvs/{id} HTTP/1.1" 200 OK
   INFO: "POST /v1/score HTTP/1.1" 200 OK
   ```

## Troubleshooting

### Analytics still showing 404
- Verify the function exists: Run `SELECT * FROM pg_proc WHERE proname = 'log_analytics_event';` in SQL Editor
- If empty, re-run Step 1

### ParseScore CV still showing 404
- Check ParseScore API logs for database connection errors
- Verify DATABASE_URL is correct in `apps/api/.env`
- Test database connection:
  ```bash
  cd apps/api
  python diagnose_database.py
  ```

### "LLM_API_KEY not set" error
- Make sure you've set `LLM_API_KEY` in `apps/api/.env`
- Restart ParseScore API after setting it

### Database schema issues
- Verify parsescore schema exists: Run `SELECT schema_name FROM information_schema.schemata;` in SQL Editor
- Should see `parsescore` in the list
- If missing, re-run Step 2

## What Changed

**Before:**
- Analytics events: ❌ 404 (function doesn't exist)
- CV parsing: ✅ Works but doesn't persist
- CV retrieval: ❌ 404 (not in database)
- AI scoring: ❌ Can't score without persisted CV

**After:**
- Analytics events: ✅ Logged to `analytics_events` table
- CV parsing: ✅ Parses and saves to `parsescore.parsed_cvs`
- CV retrieval: ✅ Retrieved from database
- AI scoring: ✅ Works with OpenAI integration

## Architecture

```
Web App (localhost:8080)
  ├─ Supabase (nxteuyzcxabqpelingje.supabase.co)
  │   ├─ Schema: public
  │   │   ├─ pricing_plans
  │   │   ├─ subscriptions
  │   │   ├─ api_keys (user API keys)
  │   │   ├─ analytics_events ← Fixed by Step 1
  │   │   └─ ...other tables
  │   │
  │   └─ Schema: parsescore ← Created by Step 2
  │       ├─ api_keys (ParseScore internal)
  │       ├─ parsed_cvs ← CV data stored here
  │       ├─ scoring_results ← Scoring results
  │       └─ job_profiles
  │
  └─ ParseScore API (localhost:8000)
      ├─ Connects to Supabase parsescore schema
      ├─ Uses OpenAI for AI scoring
      └─ Validates user API keys
```

## Notes

- The ParseScore schema is separate from the web app schema to avoid table name conflicts
- Both `public.api_keys` (user-facing) and `parsescore.api_keys` (internal) exist but serve different purposes
- The connection uses Supabase's connection pooler (port 6543) for better performance
- All ParseScore tables are prefixed with `parsescore.` to avoid conflicts

## Need Help?

Check the logs:
- **Web app console**: F12 → Console tab
- **ParseScore API**: Terminal where API is running
- **Supabase logs**: https://supabase.com/dashboard/project/nxteuyzcxabqpelingje/logs/explorer
