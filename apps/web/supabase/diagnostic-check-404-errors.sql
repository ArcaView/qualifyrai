-- Diagnostic: Check if analytics and ParseScore components exist
-- Run this in Supabase SQL Editor to diagnose the 404 errors

-- ============================================
-- CHECK 1: Does log_analytics_event function exist?
-- ============================================
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  CASE
    WHEN proname = 'log_analytics_event' THEN '✅ Analytics function exists'
    ELSE '❌ Function missing'
  END as status
FROM pg_proc
WHERE proname = 'log_analytics_event';

-- If no rows returned, the function is MISSING

-- ============================================
-- CHECK 2: Does analytics_events table exist?
-- ============================================
SELECT
  tablename,
  schemaname,
  '✅ Analytics table exists' as status
FROM pg_tables
WHERE tablename = 'analytics_events' AND schemaname = 'public';

-- If no rows returned, the table is MISSING

-- ============================================
-- CHECK 3: Does parsescore schema exist?
-- ============================================
SELECT
  schema_name,
  CASE
    WHEN schema_name = 'parsescore' THEN '✅ ParseScore schema exists'
    ELSE '❌ Schema missing'
  END as status
FROM information_schema.schemata
WHERE schema_name = 'parsescore';

-- If no rows returned, the schema is MISSING

-- ============================================
-- CHECK 4: Do ParseScore tables exist?
-- ============================================
SELECT
  tablename,
  schemaname,
  '✅ ParseScore table exists' as status
FROM pg_tables
WHERE schemaname = 'parsescore';

-- Should return: api_keys, parsed_cvs, scoring_results, job_profiles
-- If no rows returned, the tables are MISSING

-- ============================================
-- SUMMARY
-- ============================================
-- Expected results:
-- - log_analytics_event function: 1 row
-- - analytics_events table: 1 row
-- - parsescore schema: 1 row
-- - parsescore tables: 4 rows (api_keys, parsed_cvs, scoring_results, job_profiles)
--
-- If any are missing, you need to run the corresponding migration SQL
